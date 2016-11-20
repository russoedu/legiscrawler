const debug = require('debug')('parser');
const chalk = require('chalk');
const Cleaner = require('./Cleaner');

class Parser {
  /**
   * Breakes the article into it's number and it's text
   * @param  {String} cleanText    The text already cleanned to be parsed into articles
   * @return {Array}               Array with each article object
   * @example
   * [
   *    {
   *      number: '1º',
   *      article: 'Os menores de 18 anos são penalmente inimputáveis, ficando sujeitos às …'
   *    },
   *    {
   *      number: '10',
   *      article: 'É assegurada a \nparticipação dos trabalhadores e empregadores nos …'
   *    }
   * ]
   */
  static getArticles(cleanText) {
    const articleRegEx = /^(Art.)\s[0-9.?]+([o|º|o.])?\s?(-|\.)?(\s|[A-Z]+\.\s)?/gm;
    let text = cleanText;
    const articles = [];
    // Get only the article numeric part
    const articlesMatch = text.match(articleRegEx);

    // debug('articlesMatch', articlesMatch);
    // debug('cleanText: ', cleanText);
    let order = 0;
    articlesMatch.forEach((num, index) => {
      // The first split results in an empty string, so we need to treat it
      // debug('num: ', num);
      const nextNum = articlesMatch[index + 1];
      // debug('nextNum: ', nextNum);
      const numClean = Cleaner.cleanArticleNumber(num);
      // debug('numClean: ', numClean);
      const splitNextNum = text.split(nextNum);
      // const lastOne = articlesMatch.length - 1;
      // const nextNumClean = nextNum ? Cleaner.cleanArticleNumber(nextNum) : '';
      // debug('numClean:', numClean, 'nextNumClean:', nextNumClean, 'index:', index,
      //       'lastOne:', lastOne, 'splitNextNum.length', splitNextNum.length);

      text = splitNextNum ? splitNextNum[splitNextNum.length - 1] : '';
      if (index === 0) {
        articles[order] = {
          number: numClean,
          article: splitNextNum[0].split(num)[splitNextNum.length - 1],
        };
      } else {
        articles[order] = {
          number: numClean,
          article: splitNextNum[0] ? splitNextNum[0] : text,
        };
      }
      order += 1;
    });
    // const parsedText = objectToArray(articles, 'article');
    // debug(parsedText);
    return articles;
  }

  static getStructuredArticles(articles) {
    const paragraphRegEx = /^((§\s\d+(º|o|°)?\.?(\s?-)?[A-z]?\s?)|(\s?Parágrafo\súnico\s?-\s?))/gm;
    const articleDebug = '14';
    const arts = articles;

    articles.forEach((art) => {
      const article = art;
      const text = art.article;
      const paragrapsMatch = text.match(paragraphRegEx);
      const splitedContent = text.split(paragraphRegEx);
      let order = 0;
      article.article = Cleaner.postCleaning(splitedContent[0]);

      if (art.number === articleDebug) {
        debug('Art.', article.number);
        debug(article.article);
      }
      const paragraphs = [];

      if (paragrapsMatch !== null) {
        paragrapsMatch.forEach((num, index) => {
          const numClean = Cleaner.cleanParagraphNumber(num);
          paragraphs[order] = {
            number: numClean,
            paragraph: Cleaner.postCleaning(splitedContent[(index + 1) * 6]),
          };

          if (art.number === articleDebug) {
            debug(order);
            debug(paragraphs[order]);
          }
          order += 1;
        });
      }

      if (art.number === articleDebug) {
        debug(paragraphs);
      }
      if (paragraphs.length > 0) {
        article.paragraphs = paragraphs;
      }
      arts.art = article;
    // if (art.number === articleDebug) {
    //   debug(JSON.stringify(article));
    // }
    });
    // debug(arts);
    return arts;
  }
}

module.exports = Parser;
