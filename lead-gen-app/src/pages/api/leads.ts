import type { NextApiRequest, NextApiResponse } from "next";

type Lead = {
  keyword: string;
  businessName: string;
  phoneNumber: string;
  rankingPosition: number;
  website: string | null;
  location: string | null;
};

type ErrorResponse = {
  error: string;
};

type SuccessResponse = {
  leads: Lead[];
};

type PlacesTextSearchResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
};

type PlacesTextSearchResponse = {
  results?: PlacesTextSearchResult[];
  status?: string;
  next_page_token?: string;
  error_message?: string;
};

type PlacesDetailsResponse = {
  result?: {
    name?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    formatted_address?: string;
  };
  status?: string;
  error_message?: string;
};

async function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchTextSearchResults(
  query: string,
  apiKey: string,
  pageToken?: string
): Promise<PlacesTextSearchResponse> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", apiKey);
  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch Places search results (${response.status})`);
  }

  return (await response.json()) as PlacesTextSearchResponse;
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlacesDetailsResponse> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set(
    "fields",
    ["name", "formatted_phone_number", "international_phone_number", "website", "formatted_address"].join(",")
  );

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch Place details (${response.status})`);
  }

  return (await response.json()) as PlacesDetailsResponse;
}

function shouldIncludeLead(ranking: number, website: string | undefined | null) {
  if (!website) {
    return true;
  }
  return ranking > 5;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Google Maps API key is not configured." });
    return;
  }

  const { queries } = req.body as { queries?: unknown };
  if (!Array.isArray(queries) || queries.length === 0) {
    res.status(400).json({ error: "At least one query is required." });
    return;
  }

  const sanitizedQueries = queries.filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  if (sanitizedQueries.length === 0) {
    res.status(400).json({ error: "No valid queries provided." });
    return;
  }

  const aggregatedLeads: Lead[] = [];

  try {
    for (const query of sanitizedQueries) {
      let collectedForQuery = 0;
      let pageToken: string | undefined;

      for (let page = 0; page < 3 && collectedForQuery < 7; page += 1) {
        if (pageToken) {
          await delay(2000);
        }

        const searchResponse = await fetchTextSearchResults(query, apiKey, pageToken);

        if (searchResponse.status !== "OK" || !searchResponse.results) {
          break;
        }

        for (let index = 0; index < searchResponse.results.length; index += 1) {
          if (aggregatedLeads.length >= 7) {
            break;
          }

          const result = searchResponse.results[index];
          const rankingPosition = index + 1 + page * 20;

          const detailsResponse = await fetchPlaceDetails(result.place_id, apiKey);
          if (detailsResponse.status !== "OK" || !detailsResponse.result) {
            continue;
          }

          const website = detailsResponse.result.website ?? null;
          if (!shouldIncludeLead(rankingPosition, website)) {
            continue;
          }

          const phoneNumber =
            detailsResponse.result.formatted_phone_number ||
            detailsResponse.result.international_phone_number ||
            "Unknown";

          aggregatedLeads.push({
            keyword: query,
            businessName: detailsResponse.result.name ?? result.name,
            phoneNumber,
            rankingPosition,
            website,
            location:
              detailsResponse.result.formatted_address ??
              result.formatted_address ??
              result.vicinity ??
              null,
          });

          collectedForQuery += 1;

          if (aggregatedLeads.length >= 7 || collectedForQuery >= 7) {
            break;
          }
        }

        if (!searchResponse.next_page_token || aggregatedLeads.length >= 7 || collectedForQuery >= 7) {
          break;
        }

        pageToken = searchResponse.next_page_token;
      }

      if (aggregatedLeads.length >= 7) {
        break;
      }
    }

    aggregatedLeads.sort((a, b) => {
      const keywordComparison = a.keyword.toLowerCase().localeCompare(b.keyword.toLowerCase());
      if (keywordComparison !== 0) {
        return keywordComparison;
      }
      return a.rankingPosition - b.rankingPosition;
    });

    res.status(200).json({ leads: aggregatedLeads.slice(0, 7) });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unexpected error while collecting leads." });
    }
  }
}
