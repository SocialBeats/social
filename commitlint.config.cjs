module.exports = {
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'ci',
        'test',
        'tests',
        'perf',
        'build',
        'fix',
        'refactor',
        'chore',
        'style',
        'docs',
        'doc',
        'sec',
      ],
    ],

    'subject-empty': [2, 'never'],

    'header-min-length': [2, 'always', 5],
  },
};
