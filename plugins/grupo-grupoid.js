/*
        * Create By WILKER OFC
*/
import { getUrlFromDirectPath } from "@whiskeysockets/baileys"
import { default as baileysDefault, generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, command, args, text }) => {
    const isGetGroupIdCommand = /^(idgp|gp)\b$/i.test(command);
    const isInspectCommand = /^(inspect|inspeccionar)\b$/i.test(command);

    if (!isInspectCommand && !isGetGroupIdCommand) return

    const channelUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]

    let msm = 'Ocurrió un error.'
    let icons = 'https://raw.githubusercontent.com/dev-fedexyro/dat4/main/uploads/41f03a-1764714564993.jpg'
    let md = 'https://github.com/dev-fedexyro'

    let fkontak = { 
        "key": { 
            "participants":"0@s.whatsapp.net", 
            "remoteJid": "status@broadcast", 
            "fromMe": false, 
            "id": "Halo" 
        }, 
        "message": { 
            "contactMessage": { 
                "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` 
            }
        }, 
        "participant": "0@s.whatsapp.net" 
    }

    async function makeFkontak() {
        try {
            const res = await fetch(icons)
            const thumb2 = Buffer.from(await res.arrayBuffer())
            return {
                key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
                message: { locationMessage: { name: 'ID Inspector', jpegThumbnail: thumb2 } },
                participant: '0@s.whatsapp.net'
            }
        } catch {
            return fkontak
        }
    }

    async function reportError(e) {
        await conn.reply(m.chat, `${msm} Ocurrió un error.`, (await makeFkontak()) || m)
        console.log(e)
    }

    let thumb = icons
    let pp
    let inviteCode

    const MetadataGroupInfo = async (res) => {
        const idHeader = res.isCommunity ? '\`ID DE LA COMUNIDAD\`' : '\`ID DEL GRUPO\`';
        const id = res.id || "No encontrado";
        pp = await conn.profilePictureUrl(res.id, 'image').catch(e => { return null })
        inviteCode = await conn.groupInviteCode(res.id).catch(e => { return null })
        return {
            caption: `${idHeader}\n*ID:* ${id}`,
            id: id,
            inviteCode: inviteCode
        };
    }

    const inviteGroupInfo = async (groupData) => {
        const idHeader = groupData.isCommunity ? '\`ID DE LA COMUNIDAD\`' : '\`ID DEL GRUPO\`';
        const id = groupData.id || "No encontrado";
        pp = await conn.profilePictureUrl(id, 'image').catch(e => { return null })
        return {
            caption: `${idHeader}\n*ID:* ${id}`,
            id: id,
            inviteCode: groupData.inviteCode
        };
    }

    if (isGetGroupIdCommand) {
        if (!m.isGroup) {
            return conn.reply(m.chat, '*ⓘ Este comando solo funciona en grupos.*', m);
        }

        try {
            const groupMetadata = await conn.groupMetadata(m.chat);
            const { caption, id } = await MetadataGroupInfo(groupMetadata);

            const buttons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({ display_text: "Copiar ID del Grupo", copy_code: id })
                }
            ];

            const { imageMessage } = await generateWAMessageContent({ image: { url: pp || thumb } }, { upload: conn.waUploadToServer })

            const interactive = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                            body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: 'Toca el botón para copiar el ID.' }),
                            header: proto.Message.InteractiveMessage.Header.fromObject({ title: 'ID del Grupo', hasMediaAttachment: true, imageMessage }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons, messageParamsJson: '' })
                        })
                    }
                }
            }, { quoted: await makeFkontak() });

            await conn.relayMessage(m.chat, interactive.message, { messageId: interactive.key.id })

        } catch (e) {
            reportError(e);
        }
        return;
    }

    if (isInspectCommand) {     

        if (!text) return conn.reply(m.chat, '\`ⓘ Ingrese un enlace de grupo/comunidad o canal.\`', m)

        let result
        try {
            let res = text ? null : await conn.groupMetadata(m.chat)
            if (res) {
                result = await MetadataGroupInfo(res)
                console.log('Método de metadatos de grupo/comunidad')
            } else {
                const inviteUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]
                let inviteInfo
                if (inviteUrl) {
                    try {
                        inviteInfo = await conn.groupGetInviteInfo(inviteUrl)
                        result = await inviteGroupInfo(inviteInfo)
                        console.log(`Método de enlace de grupo/comunidad.`)    
                    } catch (e) {

                    }
                }
            }
        } catch (e) {

        }

        if (result && result.caption) {
            const { caption, id, inviteCode } = result;
            const link = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : args[0] || md;

            const buttons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({ display_text: `Copiar ID ${result.id.startsWith('c.') ? 'Comunidad' : 'Grupo'}`, copy_code: id })
                },
                ...(inviteCode ? [{
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({ display_text: "Copiar Enlace de Invitación", copy_code: link })
                }] : []),
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({ display_text: `Abrir ${result.id.startsWith('c.') ? 'Comunidad' : 'Grupo'}`, url: link })
                }
            ];

            const { imageMessage } = await generateWAMessageContent({ image: { url: pp || thumb } }, { upload: conn.waUploadToServer })

            const interactive = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                            body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: 'Toca un botón para copiar o abrir.' }),
                            header: proto.Message.InteractiveMessage.Header.fromObject({ title: 'Inspector de Grupos/Comunidades', hasMediaAttachment: true, imageMessage }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons, messageParamsJson: '' })
                        })
                    }
                }
            }, { quoted: await makeFkontak() });

            await conn.relayMessage(m.chat, interactive.message, { messageId: interactive.key.id })

        } else {

            let newsletterInfo
            if (!channelUrl) return conn.reply(m.chat, `*Verifique que sea un enlace válido de grupo, comunidad o canal de WhatsApp.*`, m)

            if (channelUrl) {
                try {
                    newsletterInfo = await conn.newsletterMetadata("invite", channelUrl).catch(() => null)
                    if (!newsletterInfo) return conn.reply(m.chat, `No se encontró información del canal. Verifique que el enlace sea correcto.`, m)       

                    const channelID = newsletterInfo.id || 'ID no encontrado'
                    const fullLink = args[0] || `https://whatsapp.com/channel/${channelUrl}`

                    let channelPP = newsletterInfo?.preview ? getUrlFromDirectPath(newsletterInfo.preview) : thumb

                    const caption = `*Inspector de Enlaces de Canales*\n\n` +
                                    `\`ID DEL CANAL\`\n*ID:* ${channelID}`


                    const buttons = [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({ display_text: "Copiar ID del Canal", copy_code: channelID })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({ display_text: "Abrir Canal 📢", url: fullLink })
                        }
                    ];

                    const { imageMessage } = await generateWAMessageContent({ image: { url: channelPP } }, { upload: conn.waUploadToServer })

                    const interactive = generateWAMessageFromContent(m.chat, {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                                    body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
                                    footer: proto.Message.InteractiveMessage.Footer.create({ text: 'Toca un botón para copiar o abrir.' }),
                                    header: proto.Message.InteractiveMessage.Header.fromObject({ title: 'Inspector de Canales', hasMediaAttachment: true, imageMessage }),
                                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons, messageParamsJson: '' })
                                })
                            }
                        }
                    }, { quoted: await makeFkontak() });

                    await conn.relayMessage(m.chat, interactive.message, { messageId: interactive.key.id })

                } catch (e) {
                    reportError(e)
                }
            }
        }
    }
}

handler.tags = ['tools']
handler.help = ['inspect <enlace>', 'inspeccionar <enlace>', 'idgp', 'gp']
handler.command = ['inspect', 'inspeccionar', 'idgp', 'gp']

export default handler