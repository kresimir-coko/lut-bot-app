module.exports = {
	env: {
		node: true,
	},
	extends: '@liferay',
	ignorePatterns: ['dummy-data.js'],
	parser: '@typescript-eslint/parser',
	rules: {
		'lines-around-comment': 'off',
	},
};
