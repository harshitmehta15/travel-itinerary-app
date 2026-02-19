import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const destinationSuggestions: { [key: string]: string[] } = {
  'paris': [
    'Visit the Eiffel Tower at sunset for stunning views',
    'Explore the Louvre Museum and see the Mona Lisa',
    'Take a Seine River cruise in the evening',
    'Walk through Montmartre and visit Sacré-Cœur',
    'Enjoy authentic French pastries at a local boulangerie',
    'Stroll through the Luxembourg Gardens',
    'Visit Notre-Dame Cathedral (exterior)',
    'Shop at the Champs-Élysées'
  ],
  'tokyo': [
    'Visit the historic Senso-ji Temple in Asakusa',
    'Experience the bustling Shibuya Crossing',
    'Explore traditional gardens at Shinjuku Gyoen',
    'Try authentic sushi at Tsukiji Outer Market',
    'Visit teamLab Borderless digital art museum',
    'Take a day trip to Mount Fuji',
    'Shop in the trendy Harajuku district',
    'Enjoy cherry blossoms at Ueno Park (spring season)'
  ],
  'new york': [
    'Visit the Statue of Liberty and Ellis Island',
    'Walk through Central Park',
    'See a Broadway show in Times Square',
    'Visit the Metropolitan Museum of Art',
    'Walk the High Line urban park',
    'Explore the diverse neighborhoods of Brooklyn',
    'Visit the 9/11 Memorial and Museum',
    'Enjoy pizza at a classic NYC pizzeria'
  ],
  'london': [
    'Visit the Tower of London and see the Crown Jewels',
    'Explore the British Museum',
    'Take a ride on the London Eye',
    'Visit Buckingham Palace and watch the Changing of the Guard',
    'Explore the diverse food scene at Borough Market',
    'Walk along the South Bank of the Thames',
    'Visit the iconic Big Ben and Westminster Abbey',
    'Explore the trendy neighborhoods of Shoreditch or Camden'
  ],
  'default': [
    'Research popular landmarks and attractions',
    'Try local cuisine at highly-rated restaurants',
    'Take a guided walking tour to learn about local history',
    'Visit local markets for authentic experiences',
    'Explore parks and natural areas',
    'Check out museums and cultural sites',
    'Ask locals for their favorite hidden gems',
    'Book activities that showcase local culture'
  ]
};

function getDestinationKey(destination: string): string {
  const dest = destination.toLowerCase();
  if (dest.includes('paris')) return 'paris';
  if (dest.includes('tokyo')) return 'tokyo';
  if (dest.includes('new york') || dest.includes('nyc')) return 'new york';
  if (dest.includes('london')) return 'london';
  return 'default';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { destination, startDate, endDate, description } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: 'Destination is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const destKey = getDestinationKey(destination);
    const suggestions = destinationSuggestions[destKey];

    const response = {
      suggestions: suggestions.slice(0, 5),
      destination: destination,
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
