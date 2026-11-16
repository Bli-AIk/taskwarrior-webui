<template>
	<v-app>
		<h2 class="headline">
			{{ error.statusCode }}
		</h2>
		<div>
			{{ error.message }}
		</div>
		<NuxtLink to="/">
			返回首页
		</NuxtLink>
	</v-app>
</template>

<script lang="ts">
import { defineComponent } from '@nuxtjs/composition-api';
import { NuxtError } from '@nuxt/types';

export default defineComponent({
	data () {
		return {
			pageNotFound: '404 页面不存在',
			otherError: '出错了'
		};
	},

	props: {
		error: {
			type: Object as () => NuxtError,
			required: true
		}
	},

	setup(props) {
		return {
			error: props.error
		};
	}
});
</script>
