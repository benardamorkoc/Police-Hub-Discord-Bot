const { WebhookClient, REST, ApplicationCommandOptionType, PermissionsBitField, ActionRowBuilder, Client, Routes, EmbedBuilder, SelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, GatewayIntentBits, ActivityType  } = require('discord.js');
var configLoader = require('node-env-config-file-loader');
var settings = configLoader.load('./settings.yml');
const { readdirSync } = require('fs');

const client = new Client({ intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMembers', 'GuildPresences'] });
const rest = new REST({ version: '10' }).setToken(settings.bot.token);
const { QuickDB } = require("quick.db");
const qdb = new QuickDB();


client.on('ready', async () => {
    console.log('Bot is ready.');
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        if (interaction.commandName === 'mesai') {
            const mesaiEmbed = new EmbedBuilder()
                .setAuthor({ name: 'LSPD MESAI SISTEMI', iconURL: 'https://static.wikia.nocookie.net/nopixel/images/4/43/LSPD3.png' })
                .setColor('Blue')
                .setDescription('*Merhabalar, Buradan Mesaiye \`Giriş/Çıkış\` Işlemlerini Yapabilirsiniz.*\n\n*<a:on:1165743215215915078> ∙ \`MESAI GIR\` Mesaiye **Girmenizi** Sağlar.*\n*<a:off:1165743211474604193> ∙ \`MESAI CIK\` Mesaiden **Çıkmanızı** Sağlar.*\n\n<a:warn:1165743218734936105> ∙ *Oyunda Değilseniz Ve Mesainizi Açık Olarak Bıraktıysanız Verileriniz Silinir Bu Durumun Tekrarı Halinde İhraç Edilirsiniz.*')
                .setImage('https://forum.cfx.re/uploads/default/original/4X/f/7/e/f7e79012c44e49af0a8f38dbb0d70dc324f3f9a7.png')

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mesai_gir')
                        .setLabel('MESAI GIR')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('1165684418686500904'),
                    new ButtonBuilder()
                        .setCustomId('mesai_cik')
                        .setLabel('MESAI CIK')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('1165684418686500904'),
                    new ButtonBuilder()
                        .setCustomId('bilgilerim')
                        .setLabel('BILGILERIM')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('1165684418686500904'),
                );

            await interaction.reply({ embeds: [mesaiEmbed], components: [row] });
        }

        if (interaction.commandName === 'aktif-mesai') {
            const aktifMesaiEmbed = new EmbedBuilder()
                .setAuthor({ name: 'LSPD AKTIF MESAIDEKILER', iconURL: 'https://static.wikia.nocookie.net/nopixel/images/4/43/LSPD3.png' })
                .setColor('Blue')

            let description = '';

            const guild = client.guilds.cache.get(settings.guild.id);
            const roles = guild.roles.cache.sort((a, b) => b.position - a.position).values();
            for (const role of roles) {

                for (let i = 0; i < settings.settings.roles.officers.length; i++) {
                    if (role.id === settings.settings.roles.officers[i]) {
                        if (!role.members.size > 0) continue;
                        description += `\n- <@&${role.id}>\n\n`;
                    }
                }

                const members = role.members.values();
                for (const member of members) {
                    for (let i = 0; i < settings.settings.roles.officers.length; i++) {
                        if (role.id === settings.settings.roles.officers[i]) {
                            if (!await qdb.get(`mesaiDurumu_${member.user.id}`)) continue;
                            description += `<a:on:1165743215215915078> ∙ <@${member.user.id}> | <t:${await qdb.get(`mesaiGiris_${member.user.id}`)}:R>\n`;
                        }
                    }
                }
            }

            aktifMesaiEmbed.setDescription(description);

            await interaction.reply({ embeds: [aktifMesaiEmbed], ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'mesai_gir') {

            if (await qdb.get(`mesaiDurumu_${interaction.user.id}`)) return interaction.reply({ content: 'Zaten Mesaiye Giriş Yapmışsın.', ephemeral: true });

            let toplamMesai = 'Daha Önce Mesaiye Giriş Yapmamışsın.';
            if (await qdb.get(`toplamMesai_${interaction.user.id}`)) {
                toplamMesai = `${await qdb.get(`toplamMesai_${interaction.user.id}.gun`)} Gün ${await qdb.get(`toplamMesai_${interaction.user.id}.saat`)} Saat ${await qdb.get(`toplamMesai_${interaction.user.id}.dakika`)} Dakika ${await qdb.get(`toplamMesai_${interaction.user.id}.saniye`)} Saniye`;
            }

            const girEmbed = new EmbedBuilder()
                .setAuthor({ name: 'LSPD MESAI SISTEMI', iconURL: 'https://static.wikia.nocookie.net/nopixel/images/4/43/LSPD3.png' })
                .setColor('Green')
                .setDescription(`*Merhabalar, Mesaiye Giriş Yaptınız Pis İllegallere Dikkat Et Dostum <3*\n\n:clock1: ∙ \`MESAI BAŞLAMA ZAMANIN:\` <t:${Math.floor(Date.now() / 1000)}:R>\n:clock1: ∙ \`TOPLAM MESAIN:\` ${toplamMesai}\n\n<a:warn:1165743218734936105> ∙ Unutmayınız Emek Olmadan, Yemek Olmaz.`)
                .setImage('https://forum.cfx.re/uploads/default/original/4X/f/7/e/f7e79012c44e49af0a8f38dbb0d70dc324f3f9a7.png')

            qdb.set(`mesaiDurumu_${interaction.user.id}`, true);
            qdb.push(`mesaidekiler`, interaction.user.id);
            qdb.set(`mesaiGiris_${interaction.user.id}`, Math.floor(Date.now() / 1000));

            await interaction.reply({ embeds: [girEmbed], ephemeral: true });
        }

        if (interaction.customId === 'mesai_cik') {

            if (!await qdb.get(`mesaiDurumu_${interaction.user.id}`)) return interaction.reply({ content: 'Zaten Mesaiden Çıkış Yapmışsın.', ephemeral: true });            

            const toplamMesai = timeDifference2(new Date(), new Date(await qdb.get(`mesaiGiris_${interaction.user.id}`) * 1000)).split('{split}');

            await qdb.add(`toplamMesai_${interaction.user.id}.gun`, Number(toplamMesai[0]));
            await qdb.add(`toplamMesai_${interaction.user.id}.saat`, Number(toplamMesai[1]));
            await qdb.add(`toplamMesai_${interaction.user.id}.dakika`, Number(toplamMesai[2]));
            await qdb.add(`toplamMesai_${interaction.user.id}.saniye`, Number(toplamMesai[3]));

            let toplamMesaiText = 'Daha Önce Mesaiye Giriş Yapmamışsın.';
            if (await qdb.get(`toplamMesai_${interaction.user.id}`)) {
                toplamMesaiText = `${await qdb.get(`toplamMesai_${interaction.user.id}.gun`)} Gün ${await qdb.get(`toplamMesai_${interaction.user.id}.saat`)} Saat ${await qdb.get(`toplamMesai_${interaction.user.id}.dakika`)} Dakika ${await qdb.get(`toplamMesai_${interaction.user.id}.saniye`)} Saniye`;
            }

            const cikEmbed = new EmbedBuilder()
                .setAuthor({ name: 'LSPD MESAI SISTEMI', iconURL: 'https://static.wikia.nocookie.net/nopixel/images/4/43/LSPD3.png' })
                .setColor('Red')
                .setDescription(`*Merhabalar, Mesaiden Çıkış Yaptınız Emekleriniz İçin Teşekkür Ederiz <3*\n\n:clock1: ∙ \`YAPILAN MESAI:\` ${timeDifference(new Date(), new Date(await qdb.get(`mesaiGiris_${interaction.user.id}`) * 1000))}\n:clock1: ∙ \`TOPLAM MESAIN:\` ${toplamMesaiText}\n:clock1: ∙ \`MESAI BASLAMA TARIHIN:\` <t:${await qdb.get(`mesaiGiris_${interaction.user.id}`)}:D>\n:clock1: ∙ \`MESAI BITIRME TARIHIN:\` <t:${Math.floor(Date.now() / 1000)}:D>\n\n<a:warn:1165743218734936105> ∙ Unutmayınız Emek Olmadan, Yemek Olmaz.`)
                .setImage('https://forum.cfx.re/uploads/default/original/4X/f/7/e/f7e79012c44e49af0a8f38dbb0d70dc324f3f9a7.png')

            const logChannel = client.channels.cache.get(settings.settings.channels.log);
            const logEmbed = new EmbedBuilder()
                .setAuthor({ name: 'LSPD MESAI CIKIS LOG', iconURL: 'https://static.wikia.nocookie.net/nopixel/images/4/43/LSPD3.png' })
                .setColor('Red')
                .setDescription(`\`CIKIS YAPAN MEMUR:\` <@${interaction.user.id}>\n\`CIKIS YAPAN MEMURUN ROZETI:\` ${getMemberBadge(interaction.member)}\n\n\`MESAI BASLAMA TARIHI:\` <t:${await qdb.get(`mesaiGiris_${interaction.user.id}`)}:D>\n\`MESAI BITIRME TARIHI:\` <t:${Math.floor(Date.now() / 1000)}:D>\n\`YAPILAN MESAI:\` ${timeDifference(new Date(), new Date(await qdb.get(`mesaiGiris_${interaction.user.id}`) * 1000))}\n\`TOPLAM MESAI:\` ${toplamMesaiText}`)
                .setImage('https://forum.cfx.re/uploads/default/original/4X/f/7/e/f7e79012c44e49af0a8f38dbb0d70dc324f3f9a7.png')

            logChannel.send({ embeds: [logEmbed] });

            qdb.delete(`mesaiDurumu_${interaction.user.id}`);
            qdb.delete(`mesaidekiler`, interaction.user.id);
            qdb.delete(`mesaiGiris_${interaction.user.id}`);

            await interaction.reply({ embeds: [cikEmbed], ephemeral: true });
        }
    }
});


loadCommands();

async function loadCommands() {
    let commands = [
        {
            name: 'mesai',
            description: 'Mesai giriş çıkış paneli.',
        },
        {
            name: 'aktif-mesai',
            description: 'Aktif mesai listesi.',
        },
    ];

    try {
        client.login(settings.bot.token);
        await rest.put(
            Routes.applicationCommands(
                settings.bot.id
            ),
            { body: commands }
        );
    } catch (error) {
        console.log(error);
    }

}

function timeDifference(date1,date2) {
    var difference = date1.getTime() - date2.getTime();

    var daysDifference = Math.floor(difference/1000/60/60/24);
    difference -= daysDifference*1000*60*60*24

    var hoursDifference = Math.floor(difference/1000/60/60);
    difference -= hoursDifference*1000*60*60

    var minutesDifference = Math.floor(difference/1000/60);
    difference -= minutesDifference*1000*60

    var secondsDifference = Math.floor(difference/1000);

    return ` ${daysDifference} Gün ${hoursDifference} Saat ${minutesDifference} Dakika ${secondsDifference} Saniye`.replace(/ 0 (Gün|Saat|Dakika|Saniye)/g, '');
}

function timeDifference2(date1,date2) {
    var difference = date1.getTime() - date2.getTime();

    var daysDifference = Math.floor(difference/1000/60/60/24);
    difference -= daysDifference*1000*60*60*24

    var hoursDifference = Math.floor(difference/1000/60/60);
    difference -= hoursDifference*1000*60*60

    var minutesDifference = Math.floor(difference/1000/60);
    difference -= minutesDifference*1000*60

    var secondsDifference = Math.floor(difference/1000);

    return `${daysDifference || 0}{split}${hoursDifference || 0}{split}${minutesDifference || 0}{split}${secondsDifference || 0}`;
}
