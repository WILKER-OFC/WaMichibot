import fetch from "node-fetch"
import yts from 'yt-search'
import ytdl from '@distube/ytdl-core'
import { youtubedl, youtubedlv2 } from '@bochilteam/scraper'

const BOT_NAME = "KILLUA-BOT v2.00"
const ADONIX_API = "https://api-adonix.ultraplus.click/download/ytaudio"
const ADONIX_KEY = "dvyer"

// APIs alternativas
const APIs = {
  VIKY: 'https://vihangayt.me/download/audio?url=',
  ZENZ: 'https://api.enzu.org/api/yt-audio?url=',
  TOMAS: 'https://api.tomas.media/download/audio?url=',
  NEKOS: 'https://nekos.me/api/v1/yt/audio?url='
}

global.pendingDownloads = global.pendingDownloads || new Map()

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text?.trim()) return conn.reply(m.chat, `❀ Por favor, ingresa el nombre o enlace de YouTube.`, m, global.channelInfo)

    if (global.pendingDownloads.get(m.sender)) {
      return conn.reply(
        m.chat,
        "⏳ Ya tienes una descarga en proceso. Espera a que termine.",
        m,
        global.channelInfo
      )
    }

    global.pendingDownloads.set(m.sender, true)
    await m.react('🕒')

    const videoMatch = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/)
    const query = videoMatch ? 'https://youtu.be/' + videoMatch[1] : text
    const search = await yts(query)
    const result = videoMatch
      ? search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0]
      : search.all[0]

    if (!result) throw '❌ No se encontraron resultados.'

    const { title, thumbnail, timestamp, views, ago, url, author, seconds } = result
    
    // Verificar duración (30 min = 1800 seg)
    if (seconds > 1800) throw '❌ El video supera el límite de 30 minutos.'
    
    // Verificar si es un video válido
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
      throw '❌ Enlace de YouTube no válido.'
    }

    const vistas = formatViews(views)
    const info = `「 🎵 」 *DESCARGANDO AUDIO*\n\n` +
                 `📌 *Título:* ${title}\n` +
                 `👤 *Canal:* ${author?.name || 'Desconocido'}\n` +
                 `👁️ *Vistas:* ${vistas}\n` +
                 `⏱️ *Duración:* ${timestamp}\n` +
                 `📅 *Publicado:* ${ago}\n` +
                 `🔗 *Enlace:* ${url}`

    const thumb = (await conn.getFile(thumbnail)).data
    await conn.sendMessage(m.chat, { 
      image: thumb, 
      caption: info 
    }, { quoted: m, ...global.channelInfo })

    // Intentar múltiples métodos para obtener el audio
    let audioUrl = null
    let metodo = ''
    
    // Método 1: Usar ytdl-core directamente
    try {
      const info = await ytdl.getInfo(url)
      const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' })
      if (format && format.url) {
        audioUrl = format.url
        metodo = 'ytdl-core'
      }
    } catch {}

    // Método 2: Usar scraper como respaldo
    if (!audioUrl) {
      try {
        const yt = await youtubedl(url).catch(async () => await youtubedlv2(url))
        const audio = await yt.audio['128kbps'].download()
        if (audio) {
          audioUrl = audio
          metodo = 'scraper'
        }
      } catch {}
    }

    // Método 3: Intentar APIs alternativas
    if (!audioUrl) {
      const apiResults = await Promise.any([
        fetchAudioFromAPI(url, APIs.VIKY, 'Viky'),
        fetchAudioFromAPI(url, APIs.ZENZ, 'Zenz'),
        fetchAudioFromAPI(url, APIs.TOMAS, 'Tomas'),
        fetchAudioFromAPI(url, APIs.NEKOS, 'Nekos'),
        fetchAudioFromAPI(url, `${ADONIX_API}?apikey=${ADONIX_KEY}&url=`, 'Adonix')
      ]).catch(() => null)
      
      if (apiResults) {
        audioUrl = apiResults.url
        metodo = apiResults.api
      }
    }

    if (!audioUrl) throw '❌ No se pudo obtener el audio. Intenta con otro video.'

    // Enviar el audio
    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        fileName: `${title.replace(/[^\w\s]/gi, '')}.mp3`,
        mimetype: 'audio/mpeg',
        contextInfo: {
          externalAdReply: {
            title: title.substring(0, 60),
            body: `📁 Método: ${metodo} | 🎵 ${BOT_NAME}`,
            thumbnail: thumb,
            sourceUrl: url,
            mediaType: 2
          }
        }
      },
      { quoted: m, ...global.channelInfo }
    )

    await m.react('✅')
    
  } catch (e) {
    await m.react('❌')
    console.error('Error en play:', e)
    
    let errorMsg = '❌ Error al descargar el audio.\n'
    if (e.message?.includes('Private video')) {
      errorMsg += 'El video es privado o no está disponible.'
    } else if (e.message?.includes('age restricted')) {
      errorMsg += 'El video tiene restricción de edad.'
    } else if (e.message?.includes('Unavailable')) {
      errorMsg += 'El video no está disponible en tu región.'
    } else {
      errorMsg += `Detalle: ${e.message || e}\n\nUsa *${usedPrefix}report* para informar el problema.`
    }
    
    return conn.reply(m.chat, errorMsg, m, global.channelInfo)
  } finally {
    global.pendingDownloads.delete(m.sender)
  }
}

handler.command = handler.help = ['play', 'yta', 'ytmp3', 'playaudio', 'audio']
handler.tags = ['descargas']
handler.group = true
handler.limit = 2 // Límite de uso
export default handler

// Función para probar APIs alternativas
async function fetchAudioFromAPI(url, apiUrl, apiName) {
  try {
    const fullUrl = apiUrl + encodeURIComponent(url)
    const res = await fetch(fullUrl, { timeout: 15000 })
    const data = await res.json()
    
    // Diferentes estructuras de respuesta de APIs
    const audioUrl = data?.url || data?.data?.url || data?.result?.url || data?.audio?.url
    if (audioUrl && (audioUrl.endsWith('.mp3') || audioUrl.includes('googlevideo.com'))) {
      return { url: audioUrl, api: apiName }
    }
  } catch (e) {
    console.log(`API ${apiName} falló:`, e.message)
  }
  throw new Error(`API ${apiName} no disponible`)
}

// Función para obtener audio de Adonix (original)
async function getAud(url) {
  try {
    const endpoint = `${ADONIX_API}?apikey=${ADONIX_KEY}&url=${encodeURIComponent(url)}`
    const res = await fetch(endpoint, { timeout: 10000 }).then(r => r.json())
    if (res?.data?.url) return { url: res.data.url, api: 'Adonix' }
  } catch (e) {
    console.error("Error en API Adonix:", e.message)
  }
  return null
}

function formatViews(views) {
  if (!views || views === undefined) return "N/A"
  const num = parseInt(views.toString().replace(/\D/g, ''))
  if (isNaN(num)) return "N/A"
  
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}