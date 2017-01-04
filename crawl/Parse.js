const debug = require('debug')('parse');
const htmlparser = require('htmlparser2');
const Clean = require('./Clean');
const Fix = require('./Fix');
const Category = require('../models/Category');
const Type = require('../models/Type');
// const chalk = require('chalk');

class Parse {
  /**
   * Check the layout of an HTML
   * @method layout
   * @static
   * @param {String} html The HTML that will be parsed to discover the layout
   * @return {String} The Layout of the HTML ('GENERAL_LIST', 'COLUMNS_LIST'
   *                  or 'DATES_LIST')
   */
  static layout(html) {
    debug('layout');
    // return new Promise((resolve, reject) => {
    let processing = false;
    let ignoreCount = 0;
    let countTds = false;
    let tdCounter = 0;
    let removeTd = true;
    let response = 'DATES_LIST';

    const parser = new htmlparser.Parser({
      onopentag(tag, attribs) {
          // Check if the page processing is activated
        if (processing === true) {
            // add divs inside the capture div to the ignore counter
          if (tag === 'div') {
            ignoreCount += 1;
          } else if (tag === 'tr') {
            countTds = true;
          } else if (tag === 'td' && countTds) {
            tdCounter += 1;
          } else if (tag === 'a' && countTds && tdCounter === 3) {
            removeTd = false;
          }
          // Check if the 'content-core' id is found to activate the processing
        } else if (tag === 'div' && attribs.id === 'content-core') {
          processing = true;
        }
      },
      onclosetag(tag) {
        if (processing === true) {
          if (tag === 'div') {
            if (ignoreCount === 0) {
              processing = false;
            } else if (ignoreCount > 0) {
              ignoreCount -= 1;
            }
          } else if (tag === 'tr') {
            if (tdCounter === 2 || (removeTd && tdCounter === 3)) {
              response = 'COLUMNS_LIST';
            } else if (tdCounter === 3) {
              response = 'GENERAL_LIST';
            }
          }
        }
      },
    }, {
      decodeEntities: true,
    });

    parser.write(html);
    parser.end();
      // if (response) {
    return response;
      // } else {
      //   reject();
      // }
    // });
  }

  static generalList(html) {
    let processing = false;
    let captureText = false;

    const legislations = [];
    let name;
    let url;
    let type;
    let category = {};
    const parser = new htmlparser.Parser({
      onopentag(tag, attribs) {
        // Check if the 'content-core' id is found to activate the processing
        if (tag === 'div' && attribs.id === 'content-core' && processing === false) {
          processing = true;
        // Check if the page processing is activated
        } else if (processing) {
          // add divs inside the capture div to the ignore counter
          if (tag === 'a') {
            url = attribs.href;
            captureText = true;
          }
        }
      },
      ontext(text) {
        if (processing === true && captureText === true) {
          name = Fix.name(text);
          url = Fix.url(url, name);
          debug(text, url);

          if (name && url) {
            type = Fix.type(url, name, Type.check(url));
            category = new Category({
              name,
              url,
              type,
            });
            if (type === Type.LIST) {
              category.list = [];
            }

            legislations.push(category);
          }
          captureText = false;
        }
      },
      onclosetag(tag) {
        if (tag === 'div' && processing === true) {
          processing = false;
        }
      },
    }, {
      decodeEntities: true,
    });
    parser.write(html);
    parser.end();

    return legislations;
  }

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
    const articleRegEx = /^(Art.)\s[0-9.?]+([o|º|o.|°])?\s?(-|\.)?(\s|[A-Z]+\.\s)?/gm;
    let text = cleanText;
    const articles = [];
    // Get only the article numeric part
    const articlesMatch = text.match(articleRegEx);
    // debug('articlesMatch', articlesMatch);

    let order = 0;
    articlesMatch.forEach((num, index) => {
      // The first split results in an empty string, so we need to treat it
      // debug('num: ', num);
      const nextNum = articlesMatch[index + 1];
      // debug('nextNum: ', nextNum);
      const number = Clean.articleNumber(num);
      // debug('number: ', number);
      const splitNextNum = text.split(nextNum);
      // const lastOne = articlesMatch.length - 1;
      // const nextNumClean = nextNum ? Cleaner.cleanArticleNumber(nextNum) : '';
      // debug('number:', number, 'nextNumClean:', nextNumClean, 'index:', index,
      //       'lastOne:', lastOne, 'splitNextNum.length', splitNextNum.length);

      text = splitNextNum ? splitNextNum[splitNextNum.length - 1] : '';
      if (index === 0) {
        const article = splitNextNum[0].split(num)[splitNextNum.length - 1];
        articles[order] = {
          number,
          article,
        };
      } else {
        const article = splitNextNum[0] ? splitNextNum[0] : text;
        debug(number, ': ', article);
        articles[order] = {
          number,
          article,
        };
      }
      order += 1;
    });
    // const parsedText = objectToArray(articles, 'article');
    debug(articles);
    return articles;
  }

  /**
   * Some texts don't follow the patterns and need to be treated individually
   * @static
   * @param  {String} legislationName   The name of the legislation
   * @param  {Array} dirtyArticles   Array of articles to be clean
   * @return {Array}        Array of clean articles
   */
  static cleanArticles(legislationName, dirtyArticles) {
    const articles = dirtyArticles;

    articles.forEach((article, index) => {
      articles[index].article = Clean.knownSemanticErrors(legislationName, article);
      articles[index].article = Clean.trim(article.article);
    });

    return articles;
  }
}

module.exports = Parse;
