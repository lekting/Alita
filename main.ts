import colors from 'colors';
import mongoWorker from './mongoWorker';
import instagram from './instagram';

const MongoClient 	 = require('mongodb').MongoClient;

//let bot = require('./bot');
let mongoClient: Promise<any> = connectDB();

let args: Array<string> = process.argv.slice(2);

let login: string    = args[0] || 'test',
    password: string = args[1] || 'test';

mongoClient.then(async (client: any) => {

    let mc: mongoWorker = new mongoWorker('films', client);
    console.log(colors.bold(colors.green('MongoDB загружен')));

    let inst: instagram = new instagram(login, password, mc);
    await inst.init();

    console.log(colors.bold(colors.green('Instagram загружен')));

    //bot = new bot(instagram);

    /* let max = await inst.follow();
    console.log(colors.bold(colors.green(`Подписки сделаны [${max}]`))); */

    let max = await inst.unfollow(10);
    console.log(colors.bold(colors.green(`Отписки сделаны [${max}]`)));
    

    /* let desc: string = 'Смотрите это аниме в нашем телеграм канале, ссылка в описании группы!';
    //let tags:string = '\n\n\n#фильмы #смотретьфильм #смешныемоменты #films';
    let tags: string = '\n\n\n#аниме #смотретьаниме #смешныемоменты #anime';

    let name: string = 'Аниме: Грабитель';
    let f_name: string = 'Грабитель';

    await inst.uploadVideo(`./videos/${f_name}.mp4`, `${name} 🎬\n\n${desc}${tags}`, `./videos/previews/${f_name}.jpg`);

    console.log(colors.bold(colors.green('Видео опубликовано'))); */

}).catch(error => {
    /* bot.sendMessage({
        chat_id: config.telegramAdmins[0],
        text: 'MongoDB плюнул в ебло ошибку, чекни'
    }); */
    console.log(error);
});

function connectDB(): Promise<any> {
    return new Promise((resolve, reject) => {
        MongoClient.connect('mongodb://127.0.0.1:27017', { connectTimeoutMS: 5000, useUnifiedTopology: true, useNewUrlParser: true }, (err: any, client: any) => {

            if(err) {
                reject(err);
                return;
            }
            
            resolve(client);
        });
    });
}