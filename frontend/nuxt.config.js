export default {
	server: {
		port: 8080
	},

	/*
  ** Nuxt rendering mode
  ** See https://nuxtjs.org/api/configuration-mode
  */
	ssr: false,
	/*
  ** Nuxt target
  ** See https://nuxtjs.org/api/configuration-target
  */
	target: 'static',
	/*
  ** Headers of the page
  ** See https://nuxtjs.org/api/configuration-head
  */
	head: {
		titleTemplate: '%s',
		title: 'Taskwarrior 看板',
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
		],
		link: [
			{ rel: 'icon', type: 'image/png', href: '/favicon.png' }
		]
	},
	/*
  ** Global CSS
  */
	css: [
		// mdi font
		'@mdi/font/css/materialdesignicons.css',
		// main font
		'typeface-open-sans/index.css',
		// App css
		'@/assets/app.css'
	],
	/*
  ** Plugins to load before mounting the App
  ** https://nuxtjs.org/guide/plugins
  */
	plugins: [
		{ src: '~/plugins/hotkeys.ts', mode: 'client' }
	],
	/*
  ** Auto import components
  ** See https://nuxtjs.org/api/configuration-components
  */
	components: true,
	/*
  ** Nuxt.js dev-modules
  */
	buildModules: [
		'@nuxt/typescript-build',
		'@nuxtjs/vuetify',
		'@nuxtjs/composition-api/module'
	],
	/*
  ** Nuxt.js modules
  */
	modules: [
		// Doc: https://axios.nuxtjs.org/usage
		'@nuxtjs/axios',
		'@nuxtjs/pwa',
		'@nuxtjs/proxy'
	],

	pwa: {
		meta: {
			name: 'Taskwarrior-webui'
		},
		manifest: {
			name: 'Taskwarrior-webui',
			short_name: 'Taskwarrior-webui'
		}
	},

	proxy: {
		// Backend
		'/api': {
			target: 'http://localhost:3000/',
			changeOrigin: true,
			pathRewrite: {
				'/api': ''
			}
		}
	},
	/*
  ** Axios module configuration
  ** See https://axios.nuxtjs.org/options
  */
	axios: {
		baseURL: '/'
	},
	/*
  ** vuetify module configuration
  ** https://github.com/nuxt-community/vuetify-module
  */
	vuetify: {
		defaultAssets: false,
		customVariables: ['~/assets/variables.scss'],
		treeShake: true, // to make customVariables work in dev
		lang: {
			// 2026-11-16 汉化：Vuetify 内置文案（每页行数 / 分页 / 排序提示 等）。
			// treeShake 会 tree-shake 掉 vuetify 自带的 locale 文件，所以这里显式给一份。
			current: 'zh-Hans',
			locales: {
				'zh-Hans': {
					carousel: { prev: '上一张', next: '下一张' },
					calendar: { moreEvents: '还有 {0} 项' },
					dataIterator: {
						noResultsText: '没有匹配的结果',
						loadingText: '加载中…',
						noResultsAll: '没有匹配的结果',
						rowsPerPageText: '每页行数：',
						rowsPerPageAll: '全部',
						pageText: '{0}-{1} 共 {2}',
						nextPage: '下一页',
						prevPage: '上一页'
					},
					dataTable: {
						rowsPerPageText: '每页行数：',
						ariaLabel: { sortAscending: '升序排列', sortDescending: '降序排列' }
					},
					noDataText: '暂无数据',
					close: '关闭',
					cancel: '取消',
					ok: '确定'
				}
			}
		}
	},
	/*
  ** Build configuration
  ** See https://nuxtjs.org/api/configuration-build/
  */
	build: {
	}
};
