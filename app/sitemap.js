const base = 'https://hub.protlys.com';

export default function sitemap() {
  const updated = new Date();
  return [
    { url: base + '/', lastModified: updated, changeFrequency: 'weekly', priority: 1 },
    { url: base + '/privacy', lastModified: updated, changeFrequency: 'yearly', priority: 0.2 },
    { url: base + '/terms', lastModified: updated, changeFrequency: 'yearly', priority: 0.2 },
    { url: base + '/delete-account', lastModified: updated, changeFrequency: 'yearly', priority: 0.1 },
  ];
}
