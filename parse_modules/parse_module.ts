const request         = require('request');

import config from '../config';
import telegraphceator from '../telegraph';
import { Node } from 'telegra.ph/typings/telegraph';

export interface parsed_object {
    type?: number;
    url?: string;
    name?: string;
    poster?: string;
    year?: string;
    country?: Array<string>;
    duration?: string;
    genres?: Array<string>;
    rating?: string;
    description?: string;
    trailer?: string;
    season?: string;
    count_of_series?: number;
}

export interface telegraph_object {
    title?: string;
    data?: parsed_object;
    content?: Array<Node>;
}

export default class Module {

    name: string;
    site: Array<string>;

    constructor(name: string, site: Array<string>) {
        this.name = name;
        this.site = site;
    }

    getSite(): Array<string> {
        return this.site;
    }

    getConfig(): object {
        return config;
    }

    async makeTelegraph(_: string): Promise<telegraph_object> {
        return null;
    }

    getNewTelegraphCreator() {
        return new telegraphceator();
    }

    getOutText(content: any, pages: any): string {
        return '';
    }

    async makeRequest(url: string): Promise<string> {
        return new Promise((resolve, reject) => request({
            url: url,
            encoding: 'binary',
            headers: {
                'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)'
            },
        }, (error: any, response: any, body: string) => resolve(body)));
    }

    async asyncForEach(array: Array<any>, callback: (data: any, index: number, arr: Array<any>) => void) {
        for (let index = 0; index < array.length; index++)
            await callback(array[index], index, array);
    }

    connect(arr: Array<any>, del: string) {

        let cont = '',
            i    = 0;

        if(!arr)
            return cont;
    
        arr.forEach(element => {
            if(i == 0)
                cont = (del === '#' ? del : '') + (del === '#' ? element.replace(/ /g, '') : element);
            else
                cont += (del === '#' ? ' ' + del + element.replace(/ /g, '') : del + ' ' + element);
    
            i++;
        });
    
        return cont;
    }

    async makePostRequest(url: string, data: string): Promise<string> {
        return new Promise((resolve, reject) => {
            request.post({
                headers: {
                    'content-type' : 'application/x-www-form-urlencoded',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'dnt': '1',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36'
                },
                encoding: 'binary',
                url:     url,
                body:    data
            }, (error: string, _: any, body: string) => {
                if(error) {
                    console.log(error);
                    return;
                }
                resolve(body);
            })
        });
    }
}



module.exports = Module;