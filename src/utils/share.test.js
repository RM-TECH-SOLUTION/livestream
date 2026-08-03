import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareMessage, buildSharePageHtml } from './share.js';

test('buildShareMessage returns title and share URL only', () => {
  const message = buildShareMessage({
    title: 'Summer Live Event',
    event_date: '2026-08-10',
    event_time: '18:30:00',
    thumbnail: 'https://api.rmtechsolution.com/uploads/cms/merchantId_2/1785527012_cms_6a6cfae478fd8.jpeg',
    template: 'Premium Live'
  }, 'https://example.com/123/summer-live-event');

  assert.strictEqual(message, 'Summer Live Event\nhttps://example.com/123/summer-live-event');
});

test('buildSharePageHtml includes Open Graph image tags', () => {
  const html = buildSharePageHtml({
    id: 123,
    title: 'Summer Live Event',
    subtitle: 'Join us',
    thumbnail: 'https://api.rmtechsolution.com/uploads/cms/merchantId_2/1785527012_cms_6a6cfae478fd8.jpeg',
    template: 'Premium Live'
  }, 'https://example.com/123/summer-live-event');

  assert.match(html, /og:image/i);
  assert.match(html, /twitter:image/i);
  assert.match(html, /Summer Live Event/);
});
