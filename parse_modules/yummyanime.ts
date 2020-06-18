import parse_module, { parsed_object, telegraph_object } from './parse_module';
import striptags from 'striptags';

const cloudscraper = require('cloudscraper');
 
export default class YummyAnime extends parse_module {

    constructor() {
        super('yummyanime', [ 'yummyanime.club' ])
    }

    getTypeOfVideo(type: number): string {
        switch(type){
            case 1: {
                return 'Аниме фильм';
            }
            default: {
                return 'Аниме сериал';
            }
        }
    }

    getOutText(content: any, pages: any): string {
        let text = [];
        text.push(
            '🎬 <b>' + content.name + '</b>',
            '🎭 <b>Жанры:</b> ' + this.connect(content.genres, ','),
            '🇯🇵 <b>' + content.country[0] + ' | ' + content.year + '</b>',
        );

        if(content.count_of_series)
            text.push('📝 <b>Эпизодов:</b> ' + content.count_of_series);

        text.push(
            '',
            '<a href="' + pages.url + '">' + pages.url + '</a>',
            '#Аниме ' + this.connect(content.genres, '#')
        );
        return text.join('\n');
    }

    async makeTelegraph(url: string): Promise<telegraph_object> {
        return new Promise(async (resolve, reject) => {
            let html: Array<string>;
            
            try {
                let parsed = await cloudscraper.get(url);
                
                html = parsed.split(/\r?\n/);
            } catch(ex) {
                reject('Невозможно пройти CloudFlare');
                return;
            }
            
            let data: parsed_object = {};
            
            let i = 0;

            data.type = 0;

            data.url = url;
            
            data.country = ['Япония'];

            await this.asyncForEach(html, async (element) => {
                if(element.includes('class="preview-rating"')) {
                    data.name = html[i - 4].trim();
                }

                if(element.includes('"rating-info"')) {
                    data.name = element.match(/title="(.*?)"/)[1];
                }

                if(element.includes('"og:image"')) {
                    data.poster = 'https://yummyanime.club' + element.match(/content="(.*?)"/)[1];
                }

                if(element.includes('<span>Год: </span>')) {
                    data.year = striptags(element.replace('<span>Год: </span>', '')).trim();
                }

                if(element.includes('id="content-desc-text"') && element.includes('<p>')) {
                    data.description = striptags(element).trim()
                                    .replace(/&nbsp;/g, ' ')
                                    .replace(/&laquo;/g, '«')
                                    .replace(/&raquo;/g, '»')
                                    .replace(/&mdash;/g, '—')
                                    .replace(/&quot;/g, '"')
                                    .replace(/&ndash;/g, '–')
                                    .replace(/&hellip;/g, '…');
                }

                if(element.includes('Тип:') && element.includes('фильм')) {
                    data.type = 1;
                }

                if(element.includes('<span>Сезон:</span>')) {
                    data.season = striptags(element.replace('<span>Сезон:</span>', '')).trim();
                }

                if(element.includes('<span class="genre">Жанр:</span>') || element.includes('span>Жанр:</span>')) {
                    data.genres = [];
                    for(let j = i; j < html.length; j++) {
                        if(html[j].includes('</ul>'))
                            break;

                        if(html[j].includes('<li>'))
                            data.genres.push(striptags(html[j]).trim());
                    }
                }

                if(element.includes('<span>Серии:</span>')) {
                    data.count_of_series = parseInt(striptags(element.replace('<span>Серии:</span>', '')).trim());
                }
                i++;
            });

            let telegraphceator = this.getNewTelegraphCreator();
    
            telegraphceator.addImage(data.poster)
                            .addBlock('Тип: ', this.getTypeOfVideo(data.type))
                            .addBlock('Страна: ', this.connect(data.country, ','))
                            .addBlock('Жанры: ', this.connect(data.genres, ','));

            if(data.count_of_series)
                telegraphceator.addBlock('Эпизодов: ', data.count_of_series);
            
            telegraphceator.addBlock('Смотреть онлайн: ', data.url);
            
            if(data.description) {
                telegraphceator.addBlank();
                telegraphceator.addText(data.description);
            }

            resolve({ data: data, content: telegraphceator.getContent(), title: data.name + ' (' + data.year + ')' });
        });
    }

}