/**
 * Created by maiquel on 25/01/18.
 */

(function () {
	"use strict";

	const natural = require('natural'),
		processedTweetModel = require('../model/processedTweetModel'),
		posTaggerController = require('../controller/POSTaggerController'),
		properties = require('../config/properties');

	let preProcessorControler = () => {

		let preProcessTweet = (rawTweet) => {

			console.log("Pre Processing tweet: " + rawTweet.id);

			let processedText = preProcessText(rawTweet.text.toLowerCase());

			let posTweet = new processedTweetModel();
			posTweet.id = rawTweet.id;
			posTweet.original_text = rawTweet.text;
			posTweet.pos_text = processedText;
			posTweet.classification = rawTweet.classification;
			posTweet.datetime = rawTweet.datetime;

			return posTweet;
		};

		/**
		 * Process individual texts
		 * @param text to processs
		 */

		let preProcessText = (text) => {
			let processedText = text;

			//Remove resíduos textuais como "ahuahua", "kkkk", "http", etc
			processedText = removeTrashWords(processedText);

			//Remove simbolos e números
			processedText = removeSymbols(processedText);

			// Efetua Análise Sintática e remove palavras sintaticamente
			// irrelevantes para a detecção de emoções
			processedText = removeIrrelevantWords(processedText);

			//Análise Léxica, extração dos radicais
			processedText = steemer(processedText);

			return processedText;

		};

		/**
		 * Saves a processed tweet on the database
		 * @param posTweet - target tweet
		 * @param callback - to call after done
		 */
		let savePosTweetOnDatabase = (posTweet, callback) => {
			posTweet.save((err, newTweet) => {
				if (err) {
					console.log(err);
				}
				else {
					console.log("Salvo tweet processado " + posTweet.id);
				}
				if (callback) callback();
			});
		};

		return {
			preProcessTweet: preProcessTweet,
			savePosTweetOnDatabase: savePosTweetOnDatabase,
			preProcessText: preProcessText
		}
	};

	/**
	 * Removes any word that contains trash symbols
	 * @param str - target string
	 * @returns {string} a new string without trashwords
	 */
	function removeTrashWords(str) {
		if(str){

			let words = str.split(' ');

			let trashSymbols = properties.TRASH_SYMBOLS;
			words = words.filter((word) => {
				let noTrash = true;
				trashSymbols.forEach((symbol) => {
					if (word.indexOf(symbol) >= 0) {
						noTrash = false;
					}
				});
				return noTrash;
			});

			let stopwords = properties.TRASH_WORDS;
			words = words.filter((word) => {
				return !stopwords.includes(word)
			});

			return words.join(' ');
		}
	}

	/**
	 * Removes symbols and pontuation
	 * @param str - target string
	 * @returns {string} a new string without symbols and pontuation
	 */
	function removeSymbols(str) {

		let words = str.split(' ').map((word) => {
			//removes spaces end newlines
			word = word.replace(/[\n\r]/g, ' ');

			//removes emojis
			word  = word.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '');

			['.', '..', '...', '....', ',', ';', '!', '!!', '?', '??', '???', ':', '"', "\\", "-", '“', "'", '\'', ''].forEach((symbol) => {
				word = word.replace(symbol, '');
			});

			return word;
		});

		return words.join(' ');
	}

	/**
	 * Removes irrelevant words based on pt-br sintax rules and POS Tagger classification
	 * @param str - target string
	 * @returns {string} a new string without irrelevant words based on pt-br sintax rules
	 */
	function removeIrrelevantWords(str) {
		let words = [];

		let tags = posTaggerController.getPOSTags(str);
		let irrelevantRules = properties.EXCLUDE_RULES;

		tags.forEach((tag) => {
			if (!irrelevantRules.includes(tag[1])) {
				words.push(tag[0]);
			}
		});

		return words.join(' ');
	}

	/**
	 * Obtain the radical of the words
	 * @param str - target string
	 * @returns {string} a new string of all radicals
	 */
	function steemer(str) {
		let words = str.split(' ');
		words = words.map((word) => {
			return natural.PorterStemmerPt.stem(word);
		});

		return words.join(' ')
	}

	module.exports = preProcessorControler();

}());