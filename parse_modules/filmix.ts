import parse_module, { parsed_object, telegraph_object } from './parse_module';

const iconv = require('iconv').Iconv;

const pretty = require('pretty');

export default class Filmix extends parse_module {

    iconv: any;

    constructor() {
        super('filmix', [ 'filmix.co' ]);
        
        this.iconv = new iconv('windows-1251', 'utf8');
    }

    getTypeOfVideo(type: number): string {
        switch(type){
            case 1: {
                return 'Сериал';
            }
            case 2: {
                return 'Мультфильм';
            }
            default: {
                return 'Фильм';
            }
        }
    }

    getCountry(country: string): string {
        switch(country) {
            case 'Испания': {
                return '🇪🇸';
            }
            case 'Норвегия': {
                return '🇳🇴';
            }
            case 'Дания': {
                return '🇩🇰';
            }
            case 'Россия': {
                return '🇷🇺';
            }
            case 'Великобритания': {
                return '🇬🇧';
            }
            case 'Франция': {
                return '🇫🇷';
            }
            case 'Германия': {
                return '🇩🇪';
            }
            case 'Канада': {
                return '🇨🇦';
            }
            case 'Китай': {
                return '🇨🇳';
            }
            case 'Бразилия': {
                return '🇧🇷';
            }
            case 'Бельгия': {
                return '🇧🇪';
            }
            case 'Индия': {
                return '🇮🇳';
            }
            case 'Австралия': {
                return '🇦🇺';
            }
            case 'Украина': {
                return '🇺🇦';
            }
            case 'Турция': {
                return '🇹🇷';
            }
            case 'Корея Южная': {
                return '🇰🇷';
            }
            default: {
                return '🇱🇷';
            }
        }
    }

    getOutText(content: any, pages: any): string {
        let text = [];
        text.push(
            '🎬 <b>' + content.name + '</b>',
            '🎭 <b>Жанры:</b> ' + this.connect(content.genres, ','),
            this.getCountry(content.country[0]) + ' <b>' + content.country[0] + ' | ' + content.year + '</b>',
            '⏰ <b>' + (content.type !== 1 ? 'Длительность: ' : 'Длительность серии: ') + '</b>~' + content.duration,
            '',
            '<a href="' + pages.url + '">' + pages.url + '</a>',
            '#' + this.getTypeOfVideo(content.type) + ' ' + this.connect(content.genres, '#')
        );
        return text.join('\n');
    }

    async makeTelegraph(url: string): Promise<telegraph_object> {
        return new Promise(async (resolve, _) => {

            let body = Buffer.from(await this.makeRequest(url), 'binary');

            body = this.iconv.convert(body).toString();

            let html = pretty(body).split(/\r?\n/);

            let data: parsed_object = {};
            
            let i = 0;
            data.type = 0;

            data.url = url;
            await this.asyncForEach(html, (element) => {
                if(element.includes('<h1 class="name" ')) {
                    data.name = element.match(/"name">(.+)</)[1];
                }

                if(element.includes('class="poster poster-tooltip"')) {
                    data.poster = element.match(/src="(.+)" class=/)[1];

                    if(!(data.poster.startsWith('https://') || data.poster.startsWith('http://')))
                        data.poster = url.match(/^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/igm)[0] + data.poster;

                }

                if(element.includes('Год:')) {					
                    let year = element.match(/<a [^>]*>(.+?)<\/a>/ig);

                    data.year = year[0].match(/">(.+)<\/a>/)[1];
                }

                if(element.includes('Страна:')) {

                    data.country = [];
					
                    let countries = element.match(/<a [^>]*>(.+?)<\/a>/ig);

                    for(let country of countries)
                        data.country.push(country.match(/">(.+)<\/a>/)[1]);

                    //temp.forEach(el => data.country.push(el));
                }

                if(element.includes('>Время:<')) {
                    data.duration = element.match(/item-content">(.+)<\/span>/)[1];
                }

                if(element.includes('Жанр:')) {
					data.genres = [];
					
                    let genres = element.match(/<a [^>]*>(.+?)<\/a>/ig);

                    for(let genre of genres)
                        data.genres.push(genre.match(/">(.+)<\/a>/)[1]);
                }

                /* if(element.includes('Рейтинг фильма')) {
                    data.rating = element.match(/ratingValue">(.+)<\/b>/)[1];
                } */
                
                if(element.includes('<div class="full-story">')) {
                    data.description = element.match(/<div class="full-story">(.+)<\/div>/)[1]
                }

                /* if(element.includes('href="#">трейлер</a>')) {

                    let data_id = element.match(/data-id="(.+)"/)[1],
                        body = await this.makePostRequest('https://zfilm-hd.net/engine/mods/trailer/index.php', `id=${data_id};full=1`);

                    body = body.split(/\r?\n/);
                    
                    body.forEach(elem => {
                        if(elem.includes('<iframe')) {
                            data.trailer = elem.match(/src="(.+)&amp;autoplay=1"/)[1];

                            data.trailer = elem.match(/embed\/(.+)\?/)[1];
                        }
                    });

                    data.description = await this.makePostRequest('https://zfilm-hd.net/engine/mods/ajax/story', `id=${data_id}`)
                } */

                i++;
            });

            let telegraphceator = this.getNewTelegraphCreator();

            telegraphceator.addImage(data.poster)
                            .addBlock('Тип: ', this.getTypeOfVideo(data.type))
                            .addBlock('Страна: ', this.connect(data.country, ','))
                            .addBlock('Жанры: ', this.connect(data.genres, ','))
                            .addBlock((data.type !== 1 ? 'Длительность: ' : 'Длительность серии: '), '~' + data.duration);
            
            telegraphceator.addBlock('Смотреть онлайн: ', data.url);
            
            if(data.description) {
                telegraphceator.addBlank();
                telegraphceator.addText(data.description);
            }

            if(data.trailer)
                telegraphceator.addVideo('https://youtu.be/' + data.trailer)

            resolve({ data: data, content: telegraphceator.getContent(), title: data.name + ' (' + data.year + ')' });
        });
    }

}