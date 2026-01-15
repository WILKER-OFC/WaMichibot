import yts from 'yt-search'

// Configuración
const API_URL = 'https://api-adonix.ultraplus.click/download/ytaudio'
const API_KEY = 'Mikeywilker1'
const MAX_SECONDS = 90 * 60
const HTTP_TIMEOUT_MS = 90 * 1000

globalThis.apikey = API_KEY

function parseDurationToSeconds(d) {
  if (d == null) return null
  if (typeof d === 'number' && Number.isFinite(d)) return Math.max(0, Math.floor(d))
  const s = String(d).trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Math.max(0, parseInt(s, 10))
  const parts = s.split(':').map((x) => x.trim()).filter(Boolean)
  if (!parts.length || parts.some((p) => !/^\d+$/.test(p))) return null
  let sec = 0
  for (const p of parts) sec = sec * 60 + parseInt(p, 10)
  return Number.isFinite(sec) ? sec : null
}

function formatErr(err, maxLen = 800) {
  const e = err ?? 'Error'
  let msg = e instanceof Error ? e.message : String(e)
  return msg.slice(0, maxLen)
}

async function fetchJson(url, timeoutMs = HTTP_TIMEOUT_MS) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return JSON.parse(text)
  } finally {
    clearTimeout(t)
  }
}

async function fetchBuffer(url, timeoutMs = HTTP_TIMEOUT_MS) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } finally {
    clearTimeout(t)
  }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const chatId = m?.chat || m?.key?.remoteJid
  if (!chatId) return

  if (!text) {
    return conn.sendMessage(
      chatId,
      { text: `🎵 *Play Audio*\nUso: ${usedPrefix + command} <nombre o link>` },
      { quoted: m }
    )
  }

  await conn.sendMessage(chatId, { react: { text: '🔄', key: m.key } }).catch(() => {})

  let ytUrl = text.trim()
  let ytInfo = null

  // Buscar el video
  try {
    if (!/youtu\.be|youtube\.com/i.test(ytUrl)) {
      const search = await yts(ytUrl)
      const first = search?.videos?.[0]
      if (!first) {
        await conn.sendMessage(chatId, { text: '❌ No encontrado' }, { quoted: m })
        return
      }
      ytInfo = first
      ytUrl = first.url
    } else {
      const search = await yts({ query: ytUrl })
      ytInfo = search?.videos?.[0]
    }
  } catch (e) {
    await conn.sendMessage(chatId, { text: `❌ Error: ${formatErr(e)}` }, { quoted: m })
    return
  }

  // Verificar duración
  const durSec = parseDurationToSeconds(ytInfo?.timestamp)
  if (durSec && durSec > MAX_SECONDS) {
    await conn.sendMessage(
      chatId,
      { text: `❌ Muy largo (máx ${Math.floor(MAX_SECONDS/60)} min)` },
      { quoted: m }
    )
    return
  }

  const title = ytInfo?.title || 'Audio'
  const author = ytInfo?.author?.name || ytInfo?.author || 'Desconocido'
  const thumbnail = ytInfo?.thumbnail

  // Obtener URL del audio desde API
  let audioUrl = null
  try {
    const apiUrl = `${API_URL}?apikey=${encodeURIComponent(API_KEY)}&url=${encodeURIComponent(ytUrl)}`
    const apiResp = await fetchJson(apiUrl, 15000)
    
    if (!apiResp?.status || !apiResp?.data?.url) {
      throw new Error('API sin respuesta válida')
    }
    
    audioUrl = apiResp.data.url
  } catch (e) {
    await conn.sendMessage(chatId, { text: `❌ Error API: ${formatErr(e)}` }, { quoted: m })
    return
  }

  // 📤 ENVIAR DIRECTAMENTE EL AUDIO (SOLO UN MENSAJE)
  try {
    // Opción 1: Enviar por URL (más rápido)
    await conn.sendMessage(
      chatId,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mp4',
        fileName: `${title.substring(0, 40)}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: `${title.substring(0, 40)}`,
            body: author,
            thumbnailUrl: thumbnail,
            mediaType: 2,
            mediaUrl: ytUrl,
            sourceUrl: ytUrl,
            showAdAttribution: true
          }
        }
      },
      { quoted: m }
    )

    // Si falla la opción URL, intentar con buffer
  } catch (urlError) {
    try {
      // Descargar buffer y enviar
      const audioBuffer = await fetchBuffer(audioUrl, HTTP_TIMEOUT_MS)
      
      await conn.sendMessage(
        chatId,
        {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          fileName: `${title.substring(0, 40)}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: `${title.substring(0, 40)}`,
              body: author,
              thumbnailUrl: thumbnail,
              mediaType: 2,
              mediaUrl: ytUrl,
              sourceUrl: ytUrl,
              showAdAttribution: true
            }
          }
        },
        { quoted: m }
      )
    } catch (bufferError) {
      await conn.sendMessage(
        chatId,
        { text: `❌ Error enviando audio: ${formatErr(bufferError)}` },
        { quoted: m }
      )
      return
    }
  }

  // ✅ Reacción de éxito
  await conn.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {})
}

handler.help = ['play <búsqueda>']
handler.tags = ['audio']
handler.command = ['play', 'song', 'audio', 'ytplay']
handler.limit = true

export default handler