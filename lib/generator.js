'use strict';

const pagination = require('hexo-pagination');

const fmtNum = num => {
  return num < 10 ? '0' + num : num;
};

module.exports = function(locals) {
  const config = this.config;
  let archiveDir = config.archive_dir;
  const paginationDir = config.pagination_dir || 'page';
  const allPosts = locals.posts.sort(config.archive_generator.order_by || '-date');
  const perPage = config.archive_generator.per_page;
  let result = [];

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

  const posts = {};

  // Organize posts by date
  allPosts.forEach(post => {
    const date = post.date;
    const year = date.year();
    const month = date.month() + 1; // month is started from 0

    if (!Object.prototype.hasOwnProperty.call(posts, year)) {
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
      const day = date.date();
      if (!Object.prototype.hasOwnProperty.call(posts[year][month], 'day')) {
        posts[year][month].day = {};
      }

      (posts[year][month].day[day] || (posts[year][month].day[day] = [])).push(post);
    }
  });

  const Query = this.model('Post').Query;
  const years = Object.keys(posts);
  let year, data, month, monthData, url;

  // Yearly
  for (let i = 0, len = years.length; i < len; i++) {
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
      for (let day = 1; day <= 31; day++) {
        const dayData = monthData.day[day];
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
