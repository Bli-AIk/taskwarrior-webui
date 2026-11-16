<template>
	<v-dialog
		v-model="showDialog"
		max-width="400px"
		@keydown.esc="closeDialog"
	>
		<v-card>
			<v-card-title>
				设置
			</v-card-title>
			<v-card-text>
				<v-form ref="formRef">
					<v-list-item>
						<v-list-item-content>
							<v-list-item-title>
								深色主题
							</v-list-item-title>
							<v-list-item-subtitle>
								默认主题
							</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action>
							<v-checkbox v-model="settings.dark" />
						</v-list-item-action>
					</v-list-item>

					<v-list-item>
						<v-list-item-content>
							<v-list-item-title>
								自动刷新
							</v-list-item-title>
							<v-list-item-subtitle>
								单位分钟（0 = 不刷新）
							</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action>
							<v-text-field
								v-model="settings.autoRefresh"
								style="width: 40px"
								:rules="numberRules"
							/>
						</v-list-item-action>
					</v-list-item>

					<v-list-item>
						<v-list-item-content>
							<v-list-item-title class="pb-1">
								自动同步
								<v-icon size="18px" class="ml-2" @click="sync" title="立即同步">
									mdi-sync
								</v-icon>
							</v-list-item-title>
							<v-list-item-subtitle>
								单位分钟（0 = 不自动同步）<br />
								定期执行 <code>task sync</code>
							</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action>
							<v-text-field
								v-model="settings.autoSync"
								style="width: 40px"
								:rules="numberRules"
							/>
						</v-list-item-action>
					</v-list-item>

					<v-list-item>
						<v-list-item-content>
							<v-list-item-title>
								负责人名
							</v-list-item-title>
							<v-list-item-subtitle>
								开始任务时附加为 <code>assignee:name</code>
							</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action style="width: 140px">
							<v-text-field
								v-model="settings.assigneeName"
								dense
								hide-details
								placeholder="例如 aik"
							/>
						</v-list-item-action>
					</v-list-item>
				</v-form>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="closeDialog">
					取消
				</v-btn>
				<v-btn @click="reset">
					重置
				</v-btn>
				<v-btn color="primary" @click="save">
					保存
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { watch, defineComponent, useStore, computed, ref, reactive } from '@nuxtjs/composition-api';
import { accessorType  } from "../store";

export default defineComponent({
	props: {
		value: Boolean,
	},

	setup(props, ctx) {
		const store = useStore<typeof accessorType>();

		const showDialog = computed({
			get: () => props.value,
			set: val => ctx.emit('input', val)
		});

		const numberRules = [
			(str: string) => (str && !isNaN(+str) && +str >= 0) || 'invalid'
		];

		const formRef = ref(null);
		const settings = reactive({
			dark: store.state.settings.dark,
			autoRefresh: store.state.settings.autoRefresh,
			autoSync: store.state.settings.autoSync,
			assigneeName: store.state.settings.assigneeName || ''
		});

		const reset = () => {
			settings.dark = store.state.settings.dark;
			settings.autoRefresh = store.state.settings.autoRefresh;
			settings.autoSync = store.state.settings.autoSync;
			settings.assigneeName = store.state.settings.assigneeName || '';
		};

		const closeDialog = () => {
			showDialog.value = false;
			reset();
		};

		const save = () => {
			const valid = (formRef as any).value.validate();
			if (valid) {
				store.dispatch('updateSettings', {
					...settings
				});
				closeDialog();
			}
		};

		const sync = async () => {
			await store.dispatch('syncTasks');
		};

		return {
			sync,
			showDialog,
			closeDialog,
			save,
			reset,
			settings,
			numberRules,
			formRef
		};
	}
});
</script>
