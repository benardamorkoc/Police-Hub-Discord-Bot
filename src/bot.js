const { WebhookClient, REST, ApplicationCommandOptionType, PermissionsBitField, ActionRowBuilder, Client, Routes, EmbedBuilder, SelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, GatewayIntentBits, ActivityType  } = require('discord.js');
var configLoader = require('node-env-config-file-loader');
var config = configLoader.load('./settings.yml');
const { readdirSync } = require('fs');

const client = new Client({ intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMembers', 'GuildPresences'] });
const rest = new REST({ version: '10' }).setToken(config.bot.token);
const croxydb = require("croxydb");
croxydb.setFolder('./database');

const departmentName = config.settings.departmentName;
const departmentLogo = config.settings.departmentLogo;
const departmentBanner = config.settings.departmentBanner;
const departmentColor = config.settings.departmentColor;


client.on('ready', async () => {
    console.log("Bot aktif!");
    setBotPresence(client);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        if (interaction.commandName === 'mesai') {
            const mesaiEmbed = new EmbedBuilder()
                .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                .setColor(departmentColor)
                .setDescription(`*Merhabalar, Buradan Mesaiye \`Giriş/Çıkış\` Işlemlerini Yapabilirsiniz.*\n\n*${config.settings.emojis.on} ∙ \`MESAI GIR\` Mesaiye **Girmenizi** Sağlar.*\n*${config.settings.emojis.off} ∙ \`MESAI CIK\` Mesaiden **Çıkmanızı** Sağlar.*\n\n${config.settings.emojis.warning} ∙ *Oyunda Değilseniz Ve Mesainizi Açık Olarak Bıraktıysanız Verileriniz Silinir Bu Durumun Tekrarı Halinde İhraç Edilirsiniz.*`)
                .setImage(departmentBanner)

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('mesai_gir')
                        .setLabel('MESAI GIR')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(config.settings.emojis.department),
                    new ButtonBuilder()
                        .setCustomId('mesai_cik')
                        .setLabel('MESAI CIK')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(config.settings.emojis.department),
                    new ButtonBuilder()
                        .setCustomId('bilgilerim')
                        .setLabel('BILGILERIM')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(config.settings.emojis.info),
                );

            await interaction.reply({ embeds: [mesaiEmbed], components: [row] });
        }

        if (interaction.commandName === 'aktif-mesai') {
            if (!interaction.member.roles.cache.has(config.commands.activeDuty.requiredRole)) return interaction.reply({ content: 'Bu Komutu Kullanabilmek İçin Gerekli Rolün Yok.', ephemeral: true });
            const aktifMesaiEmbed = new EmbedBuilder()
                .setAuthor({ name: departmentName + ' AKTIF MESAIDEKILER', iconURL: departmentLogo })
                .setColor(departmentColor)

            let description = '';

            const guild = client.guilds.cache.get(config.guild.id);
            const roles = guild.roles.cache.sort((a, b) => b.position - a.position).values();
            for (const role of roles) {

                for (let i = 0; i < config.settings.roles.officers.length; i++) {
                    if (role.id === config.settings.roles.officers[i]) {
                        if (!role.members.size > 0) continue;
                        description += `\n- <@&${role.id}>\n\n`;
                    }
                }

                const members = role.members.values();
                for (const member of members) {
                    for (let i = 0; i < config.settings.roles.officers.length; i++) {
                        if (role.id === config.settings.roles.officers[i]) {
                            if (!await croxydb.get(`mesaiDurumu_${member.user.id}`)) continue;
                            description += `${config.settings.emojis.on} ∙ <@${member.user.id}> | <t:${await croxydb.get(`mesaiGiris_${member.user.id}`)}:R>\n`;
                        }
                    }
                }
            }

            aktifMesaiEmbed.setDescription(description);

            await interaction.reply({ embeds: [aktifMesaiEmbed], ephemeral: true });
        }

        if (interaction.commandName === 'mesai-sıfırla') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Bu Komutu Kullanabilmek İçin \`Yönetici\` Yetkisine Sahip Olmalısın.', ephemeral: true });
            const user = interaction.options.getUser('kullanıcı') ?? false;
            const type = user ? 'user' : 'all';

            if (type === 'user') {
                const targetID = user.id;
                if (!await croxydb.get(`ilkMesaiDurumu_${targetID}`)) return interaction.reply({ content: 'Bu Kullanıcının Mesai Verisi Bulunmuyor.', ephemeral: true });

                croxydb.delete(`mesaiDurumu_${targetID}`);
                croxydb.delete(`mesaiGiris_${targetID}`);
                croxydb.delete(`toplamMesai_${targetID}`);
                croxydb.delete(`ilkMesaiDurumu_${targetID}`);
                croxydb.delete(`ilkMesaiTimestamp_${targetID}`);
                croxydb.delete(`ilkMesaiTarihi_${targetID}`);

                await croxydb.has(`mesaidekiler`) ? await croxydb.set(`mesaidekiler`, String(Number(await croxydb.get(`mesaidekiler`) - 1))) : await croxydb.set(`mesaidekiler`, "0");

                const logChannel = client.channels.cache.get(config.settings.channels.log);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI SIFIRLAMA LOG', iconURL: departmentLogo })
                    .setColor('Red')
                    .setDescription(`\`SIFIRLAYAN YONETICI:\` <@${interaction.user.id}>\n\`SIFIRLANAN KULLANICI:\` <@${targetID}>\n\`SIFIRLANAN KULLANICININ ROZETI:\` ${getMemberBadge(interaction.member)}`)
                    .setImage(departmentBanner)

                logChannel.send({ embeds: [logEmbed] });

                await interaction.reply({ content: 'Kullanıcının Mesai Verisi Başarıyla Sıfırlandı.', ephemeral: true });
            } else {
                croxydb.deleteAll();

                const logChannel = client.channels.cache.get(config.settings.channels.log);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI SIFIRLAMA LOG', iconURL: departmentLogo })
                    .setColor('Red')
                    .setDescription(`\`SIFIRLAYAN YONETICI:\` <@${interaction.user.id}>\n\`SIFIRLANAN KULLANICI:\` Bütün Kullanıcılar`)
                    .setImage(departmentBanner)

                logChannel.send({ embeds: [logEmbed] });

                await interaction.reply({ content: 'Bütün Mesai Verileri Başarıyla Sıfırlandı.', ephemeral: true });
            }
        }

        if (interaction.commandName === 'mesai-ayarla') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Bu Komutu Kullanabilmek İçin \`Yönetici\` Yetkisine Sahip Olmalısın.', ephemeral: true });
            const option = interaction.options.getString('seçenek');
            const target = interaction.options.getUser('kullanıcı');
            const time = interaction.options.getString('mesai_süresi');
            if (!await croxydb.has(`ilkMesaiDurumu_${target.id}`)) return interaction.reply({ content: 'Bu Kullanıcının Mesai Verisi Bulunmuyor.', ephemeral: true });
            if (!time.includes('Gün') && !time.includes('Saat') && !time.includes('Dakika') && !time.includes('Saniye')) return interaction.reply({ content: 'Geçersiz Mesai Süresi.', ephemeral: true });

            let realTime = time.replace('Gün', 'd').replace('Saat', 'h').replace('Dakika', 'm').replace('Saniye', 's');
            realTime = realTime.replace(' ', '');
            const timeArray = realTime.split(' ');
            let totalMs = 0;
            for (let i = 0; i < timeArray.length; i++) {
                if (timeArray[i].includes('d')) {
                    totalMs += Number(timeArray[i].replace('d', '')) * 86400 * 1000;
                } else if (timeArray[i].includes('h')) {
                    totalMs += Number(timeArray[i].replace('h', '')) * 3600 * 1000;
                } else if (timeArray[i].includes('m')) {
                    totalMs += Number(timeArray[i].replace('m', '')) * 60 * 1000;
                } else if (timeArray[i].includes('s')) {
                    totalMs += Number(timeArray[i].replace('s', '')) * 1000;
                }
            }

            let guild = client.guilds.cache.get(config.guild.id);
            let member = guild.members.cache.get(target.id);

            if (option === 'ekle') {
                await croxydb.set(`toplamMesai_${target.id}`, String(Number(await croxydb.get(`toplamMesai_${target.id}`) || 0) + totalMs));

                const targetDmEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                    .setColor('Green')
                    .setDescription(`*Merhabalar, <@${interaction.user.id}> Tarafından Toplam Mesai Sürenize Ekleme Yapıldı.\nEklenen süre ${timeDifference2(totalMs)}`)
                    .setImage(departmentBanner)

                await target.send({ embeds: [targetDmEmbed] });

                const logChannel = client.channels.cache.get(config.settings.channels.log);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI AYARLAMA LOG', iconURL: departmentLogo })
                    .setColor('Green')
                    .setDescription(`\`AYARLAYAN YONETICI:\` <@${interaction.user.id}>\n\`AYARLANAN KULLANICI:\` <@${target.id}>\n\`AYARLANAN KULLANICININ ROZETI:\` ${getMemberBadge(member)}\n\`AYARLANAN MESAISI:\` +${time}`)
                    .setImage(departmentBanner)

                logChannel.send({ embeds: [logEmbed] });

                await interaction.reply({ content: 'Kullanıcının Mesai Süresi Başarıyla Ayarlandı.', ephemeral: true });
            } else if (option === 'cikar') {
                const totalOnDutyTime = Number(await croxydb.get(`toplamMesai_${target.id}`) || 0);
                if (totalOnDutyTime < totalMs) return interaction.reply({ content: 'Kullanıcının Mesai Süresi Bu Kadar Ayarlanamaz.', ephemeral: true });
                await croxydb.set(`toplamMesai_${target.id}`, String(totalOnDutyTime - totalMs));

                const targetDmEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                    .setColor('Green')
                    .setDescription(`*Merhabalar, <@${interaction.user.id}> Tarafından Toplam Mesai Sürenizden Çıkarma Yapıldı.\nÇıkarılan süre ${timeDifference2(totalMs)}`)
                    .setImage(departmentBanner)

                await target.send({ embeds: [targetDmEmbed] });

                const logChannel = client.channels.cache.get(config.settings.channels.log);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI AYARLAMA LOG', iconURL: departmentLogo })
                    .setColor('Green')
                    .setDescription(`\`AYARLAYAN YONETICI:\` <@${interaction.user.id}>\n\`AYARLANAN KULLANICI:\` <@${target.id}>\n\`AYARLANAN KULLANICININ ROZETI:\` ${getMemberBadge(member)}\n\`AYARLANAN MESAISI:\` -${time}`)
                    .setImage(departmentBanner)

                logChannel.send({ embeds: [logEmbed] });

                await interaction.reply({ content: 'Kullanıcının Mesai Süresi Başarıyla Ayarlandı.', ephemeral: true });
            } else if (option === 'duzelt') {
                await croxydb.set(`toplamMesai_${target.id}`, String(totalMs));

                const targetDmEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                    .setColor('Green')
                    .setDescription(`*Merhabalar, <@${interaction.user.id}> Tarafından Toplam Mesai Süreniz Düzeltildi.\nYeni toplam mesai süreniz ${timeDifference2(totalMs)}`)
                    .setImage(departmentBanner)

                await target.send({ embeds: [targetDmEmbed] });

                const logChannel = client.channels.cache.get(config.settings.channels.log);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI AYARLAMA LOG', iconURL: departmentLogo })
                    .setColor('Green')
                    .setDescription(`\`AYARLAYAN YONETICI:\` <@${interaction.user.id}>\n\`AYARLANAN KULLANICI:\` <@${target.id}>\n\`AYARLANAN KULLANICININ ROZETI:\` ${getMemberBadge(member)}\n\`AYARLANAN MESAISI:\` ${time}`)
                    .setImage(departmentBanner)

                logChannel.send({ embeds: [logEmbed] });

                await interaction.reply({ content: 'Kullanıcının Mesai Süresi Başarıyla Ayarlandı.', ephemeral: true });
            } else {
                return interaction.reply({ content: 'Geçersiz Seçenek.', ephemeral: true });
            }
        }

        if (interaction.commandName === 'mesai-bitir') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Bu Komutu Kullanabilmek İçin \`Yönetici\` Yetkisine Sahip Olmalısın.', ephemeral: true });
            const target = interaction.options.getUser('kullanıcı');
            const option = interaction.options.getString('seçenek');
            const reason = interaction.options.getString('sebep') ?? 'Sebep Belirtilmedi.';
            if (!await croxydb.get(`mesaiDurumu_${target.id}`)) return interaction.reply({ content: 'Bu Kullanıcının Mesaide Değil.', ephemeral: true });

            if (option === 'ekle') {
                const totalOnDutyTime = Number(new Date() - new Date(await croxydb.get(`mesaiGiris_${target.id}`) * 1000) + Number(await croxydb.get(`toplamMesai_${target.id}`) || 0));
                await croxydb.set(`toplamMesai_${target.id}`, String(totalOnDutyTime));

                croxydb.delete(`mesaiDurumu_${target.id}`);
                croxydb.delete(`mesaiGiris_${target.id}`);

                await croxydb.has(`mesaidekiler`) ? await croxydb.set(`mesaidekiler`, String(Number(await croxydb.get(`mesaidekiler`) - 1))) : await croxydb.set(`mesaidekiler`, "0");

                setBotPresence(client);

                const targetDmEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                    .setColor('Red')
                    .setDescription(`*Merhabalar, <@${interaction.user.id}> Tarafından Mesainiz Bitirildi. Lütfen Yeniden Mesaiye Giriş Yapınız.*\n\n${config.settings.emojis.clock} ∙ \`MESAI BITIRME ZAMANIN:\` <t:${Math.floor(Date.now() / 1000)}:R>\n\n${config.settings.emojis.warning} ∙ Unutmayınız Emek Olmadan, Yemek Olmaz.`)
                    .setImage(departmentBanner)

                await target.send({ embeds: [targetDmEmbed] });

                const logChannel = client.channels.cache.get(config.settings.channels.log);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI BITIRME LOG', iconURL: departmentLogo })
                    .setColor('Red')
                    .setDescription(`\`BITIREN YONETICI:\` <@${interaction.user.id}>\n\`BITIRILEN KULLANICI:\` <@${target.id}>\n\`BITIRILEN KULLANICININ ROZETI:\` ${getMemberBadge(interaction.member)}\n\`BITIRME SEBEBI:\` ${reason}\n\`BITIRILEN KULLANICININ TOPLAM MESAISI:\` ${timeDifference2(totalOnDutyTime)}`)
                    .setImage(departmentBanner)

                logChannel.send({ embeds: [logEmbed] });

                await interaction.reply({ content: 'Kullanıcının Mesai Süresi Başarıyla Ayarlandı.', ephemeral: true });
            } else if (option === 'ekleme') {
                croxydb.delete(`mesaiDurumu_${target.id}`);
                croxydb.delete(`mesaiGiris_${target.id}`);

                await croxydb.has(`mesaidekiler`) ? await croxydb.set(`mesaidekiler`, String(Number(await croxydb.get(`mesaidekiler`) - 1))) : await croxydb.set(`mesaidekiler`, "0");

                setBotPresence(client);

                const targetDmEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                    .setColor('Red')
                    .setDescription(`*Merhabalar, <@${interaction.user.id}> Tarafından Mesainiz Bitirildi. Lütfen Yeniden Mesaiye Giriş Yapınız.*\n\n${config.settings.emojis.clock} ∙ \`MESAI BITIRME ZAMANIN:\` <t:${Math.floor(Date.now() / 1000)}:R>\n\n${config.settings.emojis.warning} ∙ Unutmayınız Emek Olmadan, Yemek Olmaz.`)
                    .setImage(departmentBanner)

                await target.send({ embeds: [targetDmEmbed] });

                const logChannel = client.channels.cache.get(config.settings.channels.log);
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: departmentName + ' MESAI BITIRME LOG', iconURL: departmentLogo })
                    .setColor('Red')
                    .setDescription(`\`BITIREN YONETICI:\` <@${interaction.user.id}>\n\`BITIRILEN KULLANICI:\` <@${target.id}>\n\`BITIRILEN KULLANICININ ROZETI:\` ${getMemberBadge(interaction.member)}\n\`BITIRME SEBEBI:\` ${reason}`)
                    .setImage(departmentBanner)

                logChannel.send({ embeds: [logEmbed] });

                await interaction.reply({ content: 'Kullanıcının Mesai Süresi Başarıyla Ayarlandı.', ephemeral: true });
            } else {
                return interaction.reply({ content: 'Geçersiz Seçenek.', ephemeral: true });
            }
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'mesai_gir') {

            if (await croxydb.get(`mesaiDurumu_${interaction.user.id}`)) return interaction.reply({ content: 'Zaten Mesaiye Giriş Yapmışsın.', ephemeral: true });

            let toplamMesai = 'Daha Önce Mesaiye Giriş Yapmamışsın.';
            if (croxydb.has(`toplamMesai_${interaction.user.id}`)) {
                toplamMesai = timeDifference2(Number(await croxydb.get(`toplamMesai_${interaction.user.id}`)));
            }

            const girEmbed = new EmbedBuilder()
                .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                .setColor('Green')
                .setDescription(`*Merhabalar, Mesaiye Giriş Yaptınız Pis İllegallere Dikkat Et Dostum <3*\n\n${config.settings.emojis.clock} ∙ \`MESAI BAŞLAMA ZAMANIN:\` <t:${Math.floor(Date.now() / 1000)}:R>\n${config.settings.emojis.clock} ∙ \`TOPLAM MESAIN:\` ${toplamMesai}\n\n${config.settings.emojis.warning} ∙ Unutmayınız Emek Olmadan, Yemek Olmaz.`)
                .setImage(departmentBanner)

            croxydb.set(`mesaiDurumu_${interaction.user.id}`, true);
            croxydb.set(`mesaiGiris_${interaction.user.id}`, Math.floor(Date.now() / 1000));

            await croxydb.has(`mesaidekiler`) ? await croxydb.set(`mesaidekiler`, String(Number(await croxydb.get(`mesaidekiler`) + 1))) : await croxydb.set(`mesaidekiler`, "1");

            if (await !croxydb.get(`ilkMesaiDurumu_${interaction.user.id}`)) {
                croxydb.set(`ilkMesaiDurumu_${interaction.user.id}`, true);
                croxydb.set(`ilkMesaiTimestamp_${interaction.user.id}`, Math.floor(Date.now() / 1000));
                croxydb.set(`ilkMesaiTarihi_${interaction.user.id}`, new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
            }

            const logChannel = client.channels.cache.get(config.settings.channels.log);
            const logEmbed = new EmbedBuilder()
                .setAuthor({ name: departmentName + ' MESAI GIRIS LOG', iconURL: departmentLogo })
                .setColor('Green')
                .setDescription(`\`GIRIS YAPAN MEMUR:\` <@${interaction.user.id}>\n\`GIRIS YAPAN MEMURUN ROZETI:\` ${getMemberBadge(interaction.member)}\n\n\`MESAI BASLAMA TARIHI:\` <t:${Math.floor(Date.now() / 1000)}:D>\n\`YAPILAN MESAI:\` ${timeDifference(new Date(), new Date(await croxydb.get(`mesaiGiris_${interaction.user.id}`) * 1000))}\n\`TOPLAM MESAI:\` ${toplamMesai}`)
                .setImage(departmentBanner)

            logChannel.send({ embeds: [logEmbed] });

            setBotPresence(client)

            await interaction.reply({ embeds: [girEmbed], ephemeral: true });
        }

        if (interaction.customId === 'mesai_cik') {
            if (!await croxydb.get(`mesaiDurumu_${interaction.user.id}`)) return interaction.reply({ content: 'Zaten Mesaiden Çıkış Yapmışsın.', ephemeral: true });            
            const totalOnDutyTime = Number(new Date() - new Date(await croxydb.get(`mesaiGiris_${interaction.user.id}`) * 1000) + Number(await croxydb.get(`toplamMesai_${interaction.user.id}`) || 0));

            await croxydb.set(`toplamMesai_${interaction.user.id}`, String(totalOnDutyTime));

            let toplamMesaiText = 'Daha Önce Mesaiye Giriş Yapmamışsın.';
            if (croxydb.has(`toplamMesai_${interaction.user.id}`)) {
                toplamMesaiText = timeDifference2(totalOnDutyTime);
            }

            const cikEmbed = new EmbedBuilder()
                .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                .setColor('Red')
                .setDescription(`*Merhabalar, Mesaiden Çıkış Yaptınız Emekleriniz İçin Teşekkür Ederiz <3*\n\n${config.settings.emojis.clock} ∙ \`YAPILAN MESAI:\` ${timeDifference(new Date(), new Date(await croxydb.get(`mesaiGiris_${interaction.user.id}`) * 1000))}\n${config.settings.emojis.clock} ∙ \`TOPLAM MESAIN:\` ${toplamMesaiText}\n${config.settings.emojis.clock} ∙ \`MESAI BASLAMA TARIHIN:\` <t:${await croxydb.get(`mesaiGiris_${interaction.user.id}`)}:D>\n${config.settings.emojis.clock} ∙ \`MESAI BITIRME TARIHIN:\` <t:${Math.floor(Date.now() / 1000)}:D>\n\n${config.settings.emojis.warning} ∙ Unutmayınız Emek Olmadan, Yemek Olmaz.`)
                .setImage(departmentBanner)

            const logChannel = client.channels.cache.get(config.settings.channels.log);
            const logEmbed = new EmbedBuilder()
                .setAuthor({ name: departmentName + ' MESAI CIKIS LOG', iconURL: departmentLogo })
                .setColor('Red')
                .setDescription(`\`CIKIS YAPAN MEMUR:\` <@${interaction.user.id}>\n\`CIKIS YAPAN MEMURUN ROZETI:\` ${getMemberBadge(interaction.member)}\n\n\`MESAI BASLAMA TARIHI:\` <t:${await croxydb.get(`mesaiGiris_${interaction.user.id}`)}:D>\n\`MESAI BITIRME TARIHI:\` <t:${Math.floor(Date.now() / 1000)}:D>\n\`YAPILAN MESAI:\` ${timeDifference(new Date(), new Date(await croxydb.get(`mesaiGiris_${interaction.user.id}`) * 1000))}\n\`TOPLAM MESAI:\` ${toplamMesaiText}`)
                .setImage(departmentBanner)

            logChannel.send({ embeds: [logEmbed] });

            croxydb.delete(`mesaiDurumu_${interaction.user.id}`);
            croxydb.delete(`mesaiGiris_${interaction.user.id}`);

            await croxydb.has(`mesaidekiler`) ? await croxydb.set(`mesaidekiler`, String(Number(await croxydb.get(`mesaidekiler`) - 1))) : await croxydb.set(`mesaidekiler`, "0");

            setBotPresence(client);

            await interaction.reply({ embeds: [cikEmbed], ephemeral: true });
        }

        if (interaction.customId === 'bilgilerim') {
            let totalOnDutyTime = 'Daha Önce Mesaiye Giriş Yapmamışsın.';
            if (croxydb.has(`toplamMesai_${interaction.user.id}`)) {
                totalOnDutyTime = timeDifference2(Number(await croxydb.get(`toplamMesai_${interaction.user.id}`)));
            }           
            let firstOnDutyTime = 'Daha Önce Mesaiye Giriş Yapmamışsın.';
            if (await croxydb.get(`ilkMesaiTarihi_${interaction.user.id}`)) firstOnDutyTime = await croxydb.get(`ilkMesaiTarihi_${interaction.user.id}`);
            let firstOnDutyTimestamp = 'Daha Önce Mesaiye Giriş Yapmamışsın.';
            if (await croxydb.get(`ilkMesaiTimestamp_${interaction.user.id}`)) firstOnDutyTimestamp = `<t:${await croxydb.get(`ilkMesaiTimestamp_${interaction.user.id}`)}:R>`;

            const bilgilerimEmbed = new EmbedBuilder()
                .setAuthor({ name: departmentName + ' MESAI SISTEMI', iconURL: departmentLogo })
                .setColor(departmentColor)
                .setDescription(`Merhabalar, <@${interaction.user.id}>\n\nİlk mesaiye giriş yaptığınız tarih;\n${firstOnDutyTime}\n${firstOnDutyTimestamp}\n\nToplam yaptığın mesai süresi;\n${totalOnDutyTime}`)
                .setImage(departmentBanner);

            await interaction.reply({ embeds: [bilgilerimEmbed], ephemeral: true });
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
        {
            name: 'mesai-sıfırla',
            description: 'Bütün mesai verilerini sıfırlar.',
            options: [
                {
                    name: 'kullanıcı',
                    description: 'Belirtilen kullanıcının mesai verilerini sıfırlar.',
                    type: 6,
                    required: false,
                },
            ],
        },
        {
            name: 'mesai-ayarla',
            description:  'Seçeceğiniz kullanıcının mesai verilerini ayarlarsınız.',
            options: [
                {
                    name: 'seçenek',
                    description: 'Yapmak istediğiniz işlemi seçin.',
                    required: true,
                    type: 3,
                    choices: [
                        {
                            name: 'ekle',
                            value: 'ekle',
                        },
                        {
                            name: 'çıkar',
                            value: 'cikar',
                        },
                        {
                            name: 'düzelt',
                            value: 'duzelt',
                        }
                    ],
                },
                {
                    name: 'kullanıcı',
                    description: 'Mesai verisi ayarlanacak kullanıcı.',
                    required: true,
                    type: 6,
                },
                {
                    name: 'mesai_süresi',
                    description: 'İşlem yapılacak mesai süresi, örnek: 1 Gün, 2 Saat, 3 Dakika veya 4 Saniye',
                    required: true,
                    type: 3,
                },
            ],
        },
        {
            name: 'mesai-bitir',
            description: 'Seçeceğiniz kullanıcının mesaisini bitirirsiniz.',
            options: [
                {
                    name: 'kullanıcı',
                    description: 'Mesai bitirilecek kullanıcı.',
                    required: true,
                    type: 6,
                },
                {
                    name: 'seçenek',
                    description: 'Kullanıcının mesai süresi toplam süresine eklensin mi?',
                    required: true,
                    type: 3,
                    choices: [
                        {
                            name: 'ekle',
                            value: 'ekle',
                        },
                        {
                            name: 'ekleme',
                            value: 'ekleme',
                        },
                    ],
                },
                {
                    name: 'sebep',
                    description: 'Mesai bitirme sebebi.',
                    required: false,
                    type: 3,
                },
            ],
        },
    ];

    try {
        client.login(config.bot.token);
        await rest.put(
            Routes.applicationCommands(
                config.bot.id
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

//function timeDifference2(date1,date2) {
    //var difference = date1.getTime() - date2.getTime();

    //var daysDifference = Math.floor(difference/1000/60/60/24);
    //difference -= daysDifference*1000*60*60*24

    //var hoursDifference = Math.floor(difference/1000/60/60);
    //difference -= hoursDifference*1000*60*60

    //var minutesDifference = Math.floor(difference/1000/60);
    //difference -= minutesDifference*1000*60

    //var secondsDifference = Math.floor(difference/1000);

    //return `${daysDifference || 0}{split}${hoursDifference || 0}{split}${minutesDifference || 0}{split}${secondsDifference || 0}`;
//}

function timeDifference2(ms) {
    var days = Math.floor(ms / (24*60*60*1000));
    var daysms=ms % (24*60*60*1000);
    var hours = Math.floor((daysms)/(60*60*1000));
    var hoursms=ms % (60*60*1000);
    var minutes = Math.floor((hoursms)/(60*1000));
    var minutesms=ms % (60*1000);
    var sec = Math.floor((minutesms)/(1000));
    var t = days + " Gün " + hours + " Saat " + minutes + " Dakika " + sec + " Saniye";
    return t;
}

async function setBotPresence(client) {
    let onDutyPoliceCount = await croxydb.has(`mesaidekiler`) ? await croxydb.get(`mesaidekiler`) : 0;
    let presenceType = ActivityType.Playing;
    let presenceStatus = 'online';
    if (config.bot.status.activity === 'playing' || config.bot.status.activity === 'PLAYING') presenceType = ActivityType.Playing;
    if (config.bot.status.activity === 'watching' || config.bot.status.activity === 'WATCHING') presenceType = ActivityType.Watching;
    if (config.bot.status.activity === 'listening' || config.bot.status.activity === 'LISTENING') presenceType = ActivityType.Listening;
    if (config.bot.status.activity === 'streaming' || config.bot.status.activity === 'STREAMING') presenceType = ActivityType.Streaming;
    if (config.bot.status.activity === 'competing' || config.bot.status.activity === 'COMPETING') presenceType = ActivityType.Competing;
    if (config.bot.status.status === 'online' || config.bot.status.status === 'ONLINE') presenceStatus = 'online';
    if (config.bot.status.status === 'idle' || config.bot.status.status === 'IDLE') presenceStatus = 'idle';
    if (config.bot.status.status === 'dnd' || config.bot.status.status === 'DND') presenceStatus = 'dnd';
    if (config.bot.status.status === 'invisible' || config.bot.status.status === 'INVISIBLE') presenceStatus = 'invisible';

    if (config.bot.status.activity === 'streaming' || config.bot.status.activity === 'STREAMING') {
        await client.user.setPresence({
            activities: [{ name: `${config.bot.status.text}`.replace('%onDutyPolice%', onDutyPoliceCount), type: presenceType, url: config.bot.status.twitch }],
            status: presenceStatus,
        });
    } else {
        await client.user.setPresence({
            activities: [{ name: `${config.bot.status.text}`.replace('%onDutyPolice%', onDutyPoliceCount), type: presenceType }],
            status: presenceStatus,
        });
    }
}

function getMemberBadge(member) {
    const roles = member.roles.cache.sort((a, b) => b.position - a.position).values();
    for (const role of roles) {
        for (let i = 0; i < config.settings.roles.officers.length; i++) {
            if (role.id === config.settings.roles.officers[i]) {
                return `<@&${role.id}>`;
            }
        }
    }
}
