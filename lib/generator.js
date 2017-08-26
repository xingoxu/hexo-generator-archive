'use strict';

var pagination = require('hexo-pagination');

var fmtNum = function(num) {
  return num < 10 ? '0' + num : num;
};

module.exports = function(locals) {
  var config = this.config;
  var archiveDir = config.archive_dir;
  var paginationDir = config.pagination_dir || 'page';
  var allPosts = locals.posts.sort('-date');
  var perPage = config.archive_generator.per_page;
  var result = [];

  if (!allPosts.length) return;

  if (archiveDir[archiveDir.length - 1] !== '/') archiveDir += '/';

  const languages = [].concat(config.language || [])
    .filter(lang => lang !== 'default');

  const defaultLanguage = languages[0];

  function generate(path, lang, posts, options) {
    options = options || {};
    options.archive = true;
    const translatedPosts = posts.filter(post => {
      if (!config.archive_generator.single_language)
        return true;
      if (lang === defaultLanguage)
        return (post.lang === lang || post.lang === undefined);
      return post.lang === lang;
    });
    let pagination_config = {
      perPage: perPage,
      layout: ['archive', 'index'],
      format: paginationDir + '/%d/',
      data: options
    };

    result = result.concat(pagination(`${lang}/${path}`, translatedPosts, pagination_config));

    if (lang == defaultLanguage)
      result = result.concat(pagination(path, translatedPosts, pagination_config));
  }

  languages.forEach(lang => generate(archiveDir, lang, allPosts));

  if (!config.archive_generator.yearly) return result;

  var posts = {};

  // Organize posts by date
  allPosts.forEach(function(post) {
    var date = post.date;
    var year = date.year();
    var month = date.month() + 1; // month is started from 0

    if (!posts.hasOwnProperty(year)) {
      // 13 arrays. The first array is for posts in this year
      // and the other arrays is for posts in this month
      posts[year] = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
      ];
    }

    posts[year][0].push(post);
    posts[year][month].push(post);
    // Daily
    if (config.archive_generator.daily) {
      var day = date.date();
      if (!posts[year][month].hasOwnProperty(day)) {
        posts[year][month].day = {};
      }

      (posts[year][month].day[day] || (posts[year][month].day[day] = [])).push(post);
    }
  });

  var Query = this.model('Post').Query;
  var years = Object.keys(posts);
  var year, data, month, monthData, url;

  // Yearly
  for (var i = 0, len = years.length; i < len; i++) {
    year = +years[i];
    data = posts[year];
    url = archiveDir + year + '/';
    if (!data[0].length) continue;

    languages.forEach(lang => generate(url, lang, new Query(data[0]), { year: year }));

    if (!config.archive_generator.monthly && !config.archive_generator.daily) continue;

    // Monthly
    for (month = 1; month <= 12; month++) {
      monthData = data[month];
      if (!monthData.length) continue;
      if (config.archive_generator.monthly) {
        languages.forEach(lang =>
          generate(url + fmtNum(month) + '/', lang, new Query(monthData), {
            year: year,
            month: month
          }));
      }

      if (!config.archive_generator.daily) continue;

      // Daily
      for (var day = 1; day <= 31; day++) {
        var dayData = monthData.day[day];
        if (!dayData || !dayData.length) continue;
        languages.forEach(lang =>
          generate(url + fmtNum(month) + '/' + fmtNum(day) + '/', new Query(dayData), {
            year: year,
            month: month,
            day: day
          }));
      }
    }
  }

  return result;
};
