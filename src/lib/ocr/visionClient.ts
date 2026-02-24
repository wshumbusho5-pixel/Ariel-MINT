/**
 * Google Vision API client for OCR bet slip parsing
 */

interface VisionTextAnnotation {
  description: string
  boundingPoly: {
    vertices: { x: number; y: number }[]
  }
}

interface VisionFullTextAnnotation {
  text: string
  pages: unknown[]
}

interface VisionResponse {
  responses: Array<{
    textAnnotations?: VisionTextAnnotation[]
    fullTextAnnotation?: VisionFullTextAnnotation
    error?: { message: string; code: number }
  }>
}

export async function detectText(imageBase64: string): Promise<{
  fullText: string
  annotations: VisionTextAnnotation[]
}> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY not configured')

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        }],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Vision API HTTP error: ${response.status}`)
  }

  const data: VisionResponse = await response.json()
  const result = data.responses[0]

  if (result.error) {
    throw new Error(`Vision API error: ${result.error.message}`)
  }

  return {
    fullText: result.fullTextAnnotation?.text ?? result.textAnnotations?.[0]?.description ?? '',
    annotations: result.textAnnotations ?? [],
  }
}
