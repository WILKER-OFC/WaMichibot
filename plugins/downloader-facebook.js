import fetch from 'node-fetch'
import cheerio from 'cheerio'

var handler = async (m, { conn, args, command, usedPrefix, text }) => {

const isCommand7 = /^(facebook|fb|facebookdl|fbdl)$/i.test(command)

async function reportError(e) {
await conn.reply(m.chat, `⁖🧡꙰ 𝙾𝙲𝚄𝚁𝚁𝙸𝙾 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁`, m, rcanal)
console.log(e)
}

async function scrapeMetadata(pageUrl) {
try {
const resp = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
const html = await resp.text()
const $ = cheerio.load(html)
const getMeta = (name, attr = 'content') =>
$(`meta[property="${name}"]`).attr(attr) ||
$(`meta[name="${name}"]`).attr(attr) ||
null
return {
title: getMeta('og:title') || getMeta('twitter:title'),
description: getMeta('og:description') || getMeta('twitter:description'),
siteName: "Facebook"
}
} catch {
return { title: null, description: null, siteName: "Facebook" }
}
}

if (isCommand7) {

if (!text) return conn.reply(m.chat, `🚩 *Ingrese un enlace de facebook*`, m, rcanal)

if (!args[0].match(/www.facebook.com|fb.watch|web.facebook.com|business.facebook.com|video.fb.com/g)) 
return conn.reply(m.chat, '🚩 *ᥒ᥆ ᥱs ᥙᥒ ᥱᥒᥣᥲᥴᥱ ᥎ᥲ́ᥣіძ᥆*', m, rcanal)

conn.reply(m.chat, '🚀 𝗗𝗲𝘀𝗰𝗮𝗿𝗴𝗮𝗻𝗱𝗼 𝗘𝗹 𝗩𝗶𝗱𝗲𝗼 𝗗𝗲 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸, 𝗘𝘀𝗽𝗲𝗿𝗲 𝗨𝗻 𝗠𝗼𝗺𝗲𝗻𝘁𝗼....', m, {
contextInfo: { 
forwardingScore: 2022, 
isForwarded: true, 
externalAdReply: {
title: packname,
body: '𝙁𝘼𝘾𝙀𝘽𝙊𝙊𝙆 - 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿',
sourceUrl: redes,
thumbnail: icons
}
}
})

m.react(rwait)

try {
// Usar la nueva API
const apiUrl = `https://api-adonix.ultraplus.click/download/facebook?apikey=KEYGOHANBOT&url=${encodeURIComponent(args[0])}`
const response = await fetch(apiUrl)
const data = await response.json()

// Verificar si la API respondió correctamente
if (!data.status || data.status !== 'success' || !data.result) {
throw new Error('No se pudo obtener el video desde la API')
}

// Extraer la URL del video (ajusta según la estructura de respuesta de la API)
const videoUrl = data.result.hd || data.result.sd || data.result.url

if (!videoUrl) {
throw new Error('No se encontró URL de video en la respuesta')
}

const meta = await scrapeMetadata(args[0])

let caption = `꒰꒰͡  *𝗩𝗶𝗱𝗲𝗼 𝗱𝗲 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸 ⁖❤️꙰* !! ര\n
┉ ᩿💭 ᩠〪ᷭׄ : *𝙏𝙄𝙏𝙐𝙇𝙊:* ${meta.title || 'No disponible'}
┉ ᩿💭 ᩠〪ᷭׄ : *𝘿𝙀𝙎𝘾𝙍𝙄𝙋𝘾𝙄𝙊́𝙉:* ${meta.description || 'No disponible'}
┉ ᩿💭 ᩠〪ᷭׄ : *𝙎𝙄𝙏𝙄𝙊:* Facebook
┉ ᩿💭 ᩠〪ᷭׄ : *𝙀𝙉𝙇𝘼𝘲𝙐𝙀 𝙊𝙍𝙄𝙂𝙄𝙉𝘼𝙇:* ${args[0]}
┉ ᩿💭 ᩠〪ᷭׄ : *𝘾𝘼𝙇𝙄𝘿𝘼𝘿:* ${data.result.hd ? 'HD' : data.result.sd ? 'SD' : 'Desconocida'}
────────────────
> ${global.wm}
`

await conn.sendFile(m.chat, videoUrl, 'facebook.mp4', caption, m)

} catch (e) {
console.error('Error al descargar video:', e)
await conn.reply(m.chat, `⁖🧡꙰ 𝙴𝚁𝚁𝙾𝚁: No se pudo descargar el video. Verifica que el enlace sea válido.\n\nError: ${e.message}`, m, rcanal)
}
}
}

handler.help = ['fb']
handler.tags = ['descargas']
handler.command = ['fb', 'facebook']
handler.register = false

export default handler