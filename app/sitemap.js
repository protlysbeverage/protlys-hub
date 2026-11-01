const base = 'https://hub.protlys.com';

export default function sitemap() {
  return [
    { url: base + '/', changeFrequency: 'weekly', priority: 1 },
    { url: base + '/calculator', changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { url: base + '/terms', changeFrequency: 'yearly', priority: 0.2 },
    { url: base + '/delete-account', changeFrequency: 'yearly', priority: 0.1 },
  ];
}
