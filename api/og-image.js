export default async function handler(req, res) {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  try {
    // Fetch event details
    const response = await fetch(
      `https://api.rmtechsolution.com/fetchLiveEvent.php?id=${eventId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error("Event not found");
    }

    const data = await response.json();

    // Resolve thumbnail URL
    const THUMBNAIL_BASE_URL = "https://api.rmtechsolution.com/uploads/thumbnails";
    let thumbnailUrl = data.thumbnail || "";
    
    if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
      thumbnailUrl = `${THUMBNAIL_BASE_URL}/${thumbnailUrl}`;
    }

    // If we have a thumbnail, redirect to it
    if (thumbnailUrl) {
      return res.status(301).redirect(thumbnailUrl);
    }

    // Fallback to default image
    const defaultImage = "https://api.rmtechsolution.com/uploads/cms/merchantId_2/1785527012_cms_6a6cfae478fd8.jpeg";
    return res.status(301).redirect(defaultImage);

  } catch (error) {
    console.error("Error generating og-image:", error);
    // Return default image on error
    res.status(301).redirect("https://api.rmtechsolution.com/uploads/cms/merchantId_2/1785527012_cms_6a6cfae478fd8.jpeg");
  }
}
