import { Node } from "telegra.ph/typings/telegraph";

export default class TelegraphCreator {

    content: Array<Node>

    constructor() {
        this.clear();
    }

    clear(): void {
        this.content = [];
    }

    getContent(): Array<Node> {
        return this.content;
    }

    createTag(tagName: string): any {
        return { tag: tagName, children: [] };
    }

    addBlank(): this {
        let p = this.createTag('p');

        this.appendTagToTag(p, { tag: 'br' });
        this.content.push(p);

        return this;
    }

    addText(text: any): this {
        let p = this.createTag('p');

        this.appendTagToTag(p, text);

        this.content.push(p);

        return this;
    }

    addBlock(text: any, text1: any): this {
        let p       = this.createTag('p'),
            strong  = this.createTag('strong');
    
        this.appendTagToTag(strong, text);
        this.appendTagToTag(p, strong);
        this.appendTagToTag(p, text1);
    
        this.content.push(p);
        
        return this;
    }

    appendTagToTag(tag: any, newtag: any): this {
        if(typeof newtag === 'string' && (newtag.startsWith('https') || newtag.startsWith('http'))) {
            let a = this.createTag('a');

            a.children.push(newtag);

            a.attrs = {
                href: newtag,
                target: '_blank'
            };

            tag.children.push(a);
            return this;
        }
    
        tag.children.push(newtag);
        return this;
    }

    addImage(src: string, caption?: any) {
        caption = caption || '';

        let figure      = this.createTag('figure'),
            img         = this.createTag('img'),
            figcaption  = this.createTag('figcaption');
    
        img.attrs = {
            src: src
        };
    
        this.appendTagToTag(figcaption, caption);
        this.appendTagToTag(figure, img);
        this.appendTagToTag(figure, figcaption);
    
        this.content.push(figure);

        return this;
    }

    addVideo(src: string, caption?: any) {
        caption = caption || '';
        
        let figure      = this.createTag('figure'),
            iframe      = this.createTag('iframe'),
            figcaption  = this.createTag('figcaption');
    
        iframe.attrs = {
            src: '/embed/youtube?url=' + src,
            width: '640',
            height: '360',
            frameborder: '0',
            allowtransparency: 'true',
            allowfullscreen: 'true',
            scrolling: 'no'
        };
    
        this.appendTagToTag(figcaption, caption);
        this.appendTagToTag(figure, iframe);
        this.appendTagToTag(figure, figcaption);
    
        this.content.push(figure);

        return this;
    }

}


module.exports = TelegraphCreator;