import parse_module, { parsed_object, telegraph_object } from './parse_module';

const pretty = require('pretty');

export default class ZFilmHD extends parse_module {

    constructor() {//NEED TO REWORK, CAPTCHA
        super('zfilm-hd', [ 'zfilm-hd.org' ])
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
        return new Promise(async (resolve, reject) => {

            let html = pretty(await this.makeRequest(url)).split(/\r?\n/);
			

            let data: parsed_object = {};
            
            let i = 0;
            data.type = 0;

            data.url = url;
            await this.asyncForEach(html, async (element: string) => {
                if(element.includes('og:title"')) {
                    data.name = element.match(/content="(.+)"/)[1];
                }

                if(element.includes('poster-video')) {
                    data.poster = element.match(/src="(.+)" alt=/)[1];
                }

                if(element.includes('Год:')) {
                    data.year = html[i + 1].match(/\/">(.+)<\/a>/)[1];
                }

                if(element.includes('Страна:')) {
                    let re = [...html[i + 1].matchAll(/\/">(.*?)<\/a>/g)];
                    let temp = re;
                    data.country = [];

                    temp.forEach(el => data.country.push(el[1]));
                }

                if(element.includes('Описание сериала')) {
                    data.type = 1;
                }

                if(element.includes('Описание мультфильма')) {
                    data.type = 2;
                }

                if(element.includes('>Время:<')) {
                    
                    data.duration = html[i + 1].match(/">(.+)<\/p>/)[1];
                }

                if(element.includes('Жанр:')) {
                    let parsed = html[i + 1].match(/">(.+)<\/p>/)[1];
                    
                    let temp = parsed.split(',');

                    data.genres = [];

                    temp.forEach((el: string) => data.genres.push(el.trim()));
                }

                if(element.includes('href="#">трейлер</a>')) {

                    let data_id = element.match(/data-id="(.+)"/)[1],
                        body = await this.makePostRequest('https://zfilm-hd.net/engine/mods/trailer/index.php', `id=${data_id};full=1`);

                    let splitted = body.split(/\r?\n/);
                    
                    splitted.forEach((elem: string) => {
                        if(elem.includes('<iframe')) {
                            data.trailer = elem.match(/src="(.+)&amp;autoplay=1"/)[1];

                            data.trailer = elem.match(/embed\/(.+)\?/)[1];
                        }
                    });

                    data.description = await this.makePostRequest('https://zfilm-hd.net/engine/mods/ajax/story', `id=${data_id}`)
                }

                i++;
            });

            /*let telegraphceator = this.getNewTelegraphCreator();

            this.getCatCutURL(data).then((url) => {
                data.cutCatUrl = url;
                if(!data.cutCatUrl || data.cutCatUrl === '0') {
                    console.log('Ошибка CatCut!');
                    resolve(undefined);
                    return;
                }
    
                telegraphceator.addImage(data.poster)
                              .addBlock('Тип: ', this.getTypeOfVideo(data.type))
                              .addBlock('Страна: ', this.connect(data.country, ','))
                              .addBlock('Жанры: ', this.connect(data.genres, ','))
                              .addBlock((data.type !== 1 ? 'Длительность: ' : 'Длительность серии: '), '~' + data.duration);
               
               telegraphceator.addBlock('Смотреть онлайн: ', data.cutCatUrl);
               
                if(data.description) {
                    telegraphceator.addBlank();
                    telegraphceator.addText(data.description);
                }
    
                if(data.trailer)
                    telegraphceator.addVideo('https://youtu.be/' + data.trailer)
    
               resolve({ data: data, content: telegraphceator.getContent(), title: data.name + ' (' + data.year + ')' });
            }).catch((err) => reject(err));*/
        });
    }

}