export async function GET() {
  const manifest = {
    id: "https://hub.protlys.com/",
    name: "Protlys Hub",
    short_name: "Protlys",
    description: "Move more, fuel better and stay consistent. Track movement, keep up with your protein goals, take on challenges and connect with the Protlys community.",
    start_url: "https://hub.protlys.com/",
    scope: "https://hub.protlys.com/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#F7F8F6",
    theme_color: "#6BCB45",
    orientation: "portrait",    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
