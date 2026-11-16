<template>
	<div class="px-md-6 px-lg-12">
		<v-row class="px-4 pt-4 align-center">
			<div class="headline d-flex align-center">{{ mode === 'Kanban' ? '看板' : '列表' }}</div>
			
			<v-select
				class="mb-3 ml-4"
				:items="projectOptions"
				:menu-props="{ maxHeight: 480 }"
				label="项目"
				v-model="selectedProject"
				style="max-width: 260px"
				hide-details
				dense
			/>

			<v-select
				class="mb-3 ml-3"
				:items="assigneeOptions"
				label="负责人"
				v-model="selectedAssignee"
				style="max-width: 180px"
				hide-details
				dense
			/>

			<v-text-field
				class="mb-3 ml-3"
				label="搜索任务…"
				v-model="searchQuery"
				prepend-inner-icon="mdi-magnify"
				clearable
				dense
				hide-details
				style="max-width: 220px"
			/>

			<v-spacer />
			<v-select
				class="mb-3 ml-3"
				:items="allModes"
				label="显示模式"
				v-model="mode"
				style="max-width: 140px"
				hide-details
				dense
			/>
		</v-row>

		<KanbanBoard
			v-if="mode === 'Kanban'"
			:tasks="filteredTasks"
			:active-task-uuid="activeTaskUuid"
			@column-change="handleColumnChange"
			@toggle-timer="handleToggleTimer"
			@complete="handleCompleteTask"
			@delete="handleDeleteTask"
			@edit="handleEditTask"
		/>
		<TaskList v-else :tasks="filteredTasks" ref="taskListRef" />

		<TaskDialog v-model="showTaskDialog" :task="editingTask || undefined" />
		<SnoozeDialog v-model="showSnoozeDialog" @confirm="handleSnoozeConfirm" @cancel="handleSnoozeCancel" />
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, ComputedRef, useStore, useContext, useRoute, useRouter } from '@nuxtjs/composition-api';
import TaskList from '../components/TaskList.vue';
import KanbanBoard from '../components/KanbanBoard.vue';
import TaskDialog from '../components/TaskDialog.vue';
import SnoozeDialog from '../components/SnoozeDialog.vue';
import { Task } from 'taskwarrior-lib';
import { accessorType  } from "../store";

export default defineComponent({
	components: {
		TaskList,
		KanbanBoard,
		TaskDialog,
		SnoozeDialog
	},
	setup() {
		const store = useStore<typeof accessorType>();
		const context = useContext();
		const route = useRoute();
		const router = useRouter();

		store.dispatch('fetchTasks');

		// Auto Refresh
		let refreshInterval: NodeJS.Timeout | null = null;
		const setAutoRefresh = () => {
			if (refreshInterval)
				clearInterval(refreshInterval);
			const freq = +store.state.settings.autoRefresh;
			if (freq > 0) {
				refreshInterval = setInterval(() => {
					store.dispatch('fetchTasks');
				}, +store.state.settings.autoRefresh * 60000);
			}
		};
		setAutoRefresh();

		// Auto Sync
		let syncInterval: NodeJS.Timeout | null = null;
		const setAutoSync = () => {
			if (syncInterval)
				clearInterval(syncInterval);
			const freq = +store.state.settings.autoSync;
			if (freq > 0) {
				syncInterval = setInterval(() => {
					store.dispatch('syncTasks');
				}, +store.state.settings.autoSync * 60000);
			}
		};
		setAutoSync();

		// Update settings
		watch(() => store.state.settings, () => {
			setAutoSync();
			setAutoRefresh();
			context.$vuetify.theme.dark = store.state.settings.dark;
		});

		const mode = ref((route.value.query.mode as string) || 'Tasks');
		const allModes = [
				{ text: '列表', value: 'Tasks' },
				{ text: '看板', value: 'Kanban' }
			];

		const selectedProject = ref((route.value.query.project as string) || '(All Projects)');
		const projects = computed(() => store.getters.projects);
		const projectPrefixes = computed(() => {
			const set = new Set<string>();
			for (const p of projects.value as string[]) {
				const i = p.indexOf('.');
				if (i > 0) set.add(p.slice(0, i + 1));
			}
			return [...set].sort();
		});

		// 项目下拉：先给「全部/无项目」＋ 每个一级前缀的快捷筛选（aik.* / a8fq.* …），
		// 再按前缀分组列出具体项目。前缀项的 value 是 #p:<prefix>，由 filteredTasks 识别。
		const projectOptions = computed(() => {
			const opts: any[] = [
				{ header: '快速筛选' },
				{ text: '（全部项目）', value: '(All Projects)' },
				{ text: '（无项目）', value: '(No Project)' }
			];
			for (const pfx of projectPrefixes.value) {
				opts.push({ text: `${pfx}* 全部`, value: `#p:${pfx}` });
			}
			opts.push({ divider: true }, { header: '按项目' });
			for (const p of [...(projects.value as string[])].sort()) {
				opts.push({ text: p, value: p });
			}
			return opts;
		});

		const selectedAssignee = ref((route.value.query.assignee as string) || '(All Assignees)');
		const assignees = computed(() => store.getters.assignees);
		const assigneeOptions = computed(() => [
				{ text: '（全部负责人）', value: '(All Assignees)' },
				{ text: '（未指派）', value: '(Unassigned)' },
				...assignees.value.map((a: string) => ({ text: a, value: a }))
			]);

		const searchQuery = ref((route.value.query.search as string) || '');

		let searchDebounceTimer: any = null;
		const updateSearchQueryParam = (newSearch: string) => {
			if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
			searchDebounceTimer = setTimeout(() => {
				const currentSearchInRoute = (route.value.query.search as string) || '';
				const trimmed = (newSearch || '').trim();
				if (currentSearchInRoute !== trimmed) {
					const query: Record<string, string> = { ...(route.value.query as Record<string, string>) };
					if (trimmed) {
						query.search = trimmed;
					} else {
						delete query.search;
					}
					router.replace({ query }).catch(() => {});
				}
			}, 300);
		};

		watch(searchQuery, (newVal) => {
			updateSearchQueryParam(newVal);
		});

		watch([mode, selectedProject, selectedAssignee], ([newMode, newProject, newAssignee]) => {
			const query: Record<string, string> = { ...(route.value.query as Record<string, string>) };
			if (newMode !== 'Tasks') query.mode = newMode;
			else delete query.mode;

			if (newProject !== '(All Projects)') query.project = newProject;
			else delete query.project;

			if (newAssignee !== '(All Assignees)') query.assignee = newAssignee;
			else delete query.assignee;

			const trimmedSearch = (searchQuery.value || '').trim();
			if (trimmedSearch) query.search = trimmedSearch;
			else delete query.search;

			router.replace({ query }).catch(() => {});
		});

		watch(() => route.value.query, (newQuery) => {
			if (newQuery.mode && newQuery.mode !== mode.value) mode.value = newQuery.mode as string;
			if (!newQuery.mode && mode.value !== 'Tasks') mode.value = 'Tasks';

			if (newQuery.project && newQuery.project !== selectedProject.value) selectedProject.value = newQuery.project as string;
			if (!newQuery.project && selectedProject.value !== '(All Projects)') selectedProject.value = '(All Projects)';

			if (newQuery.assignee && newQuery.assignee !== selectedAssignee.value) selectedAssignee.value = newQuery.assignee as string;
			if (!newQuery.assignee && selectedAssignee.value !== '(All Assignees)') selectedAssignee.value = '(All Assignees)';

			const routeSearch = (newQuery.search as string) || '';
			if (routeSearch !== (searchQuery.value || '').trim()) {
				searchQuery.value = routeSearch;
			}
		}, { deep: true });

		const allTasks: ComputedRef<Task[]> = computed(() => store.state.tasks);
		const activeTaskUuid = computed(() => store.state.activeTask?.uuid || '');

		const filteredTasks = computed(() => {
			let result = store.state.tasks || [];

			// Project filter
			if (selectedProject.value && selectedProject.value.startsWith('#p:')) {
				const pfx = selectedProject.value.slice(3);
				result = result.filter(t => (t.project || '').startsWith(pfx));
			} else if (selectedProject.value === '(No Project)') {
				result = result.filter(t => !t.project);
			} else if (selectedProject.value && selectedProject.value !== '(All Projects)') {
				result = result.filter(t => t.project === selectedProject.value);
			}

			// Assignee filter
			if (selectedAssignee.value === '(Unassigned)') {
				result = result.filter(t => !(t as any).assignee && !(t as any).assignees);
			} else if (selectedAssignee.value && selectedAssignee.value !== '(All Assignees)') {
				result = result.filter(t => (t as any).assignee === selectedAssignee.value || (t as any).assignees === selectedAssignee.value);
			}

			// Search filter
			const search = (searchQuery.value || '').trim().toLowerCase();
			if (search) {
				result = result.filter(t => (t.description || '').toLowerCase().includes(search));
			}

			return result;
		});

		const showTaskDialog = ref(false);
		const editingTask = ref<Task | null>(null);

		const showSnoozeDialog = ref(false);
		const taskToSnooze = ref<Task | null>(null);

		const handleEditTask = (task: Task) => {
			editingTask.value = task;
			showTaskDialog.value = true;
		};

		const handleCompleteTask = async (task: Task) => {
			await store.dispatch('updateTasks', [{
				...task,
				status: 'completed'
			}]);
		};

		const handleDeleteTask = async (task: Task) => {
			await store.dispatch('deleteTasks', [task]);
		};

		const handleToggleTimer = async (task: Task) => {
			if (task.start || task.uuid === activeTaskUuid.value) {
				await store.dispatch('stopTimer', task.uuid);
			} else {
				await store.dispatch('startTimer', task.uuid);
			}
		};

		const handleColumnChange = async ({ task, targetColumnId }: { task: Task; targetColumnId: string }) => {
			try {
				if (targetColumnId === 'inProgress') {
					await store.dispatch('startTimer', task.uuid);
				} else if (targetColumnId === 'done') {
					if (task.start || task.uuid === activeTaskUuid.value) {
						await store.dispatch('stopTimer', task.uuid);
					}
					const payload = { ...task, status: 'completed' };
					if (payload.start) delete payload.start;
					await store.dispatch('updateTasks', [payload]);
				} else if (targetColumnId === 'todo') {
					if (task.start || task.uuid === activeTaskUuid.value) {
						await store.dispatch('stopTimer', task.uuid);
					}
					if (task.status === 'completed' || task.wait || task.scheduled) {
						const updatedTask = { ...task, status: 'pending' };
						if (updatedTask.wait) delete updatedTask.wait;
						if (updatedTask.scheduled) delete updatedTask.scheduled;
						if (updatedTask.start) delete updatedTask.start;
						await store.dispatch('updateTasks', [updatedTask]);
					}
				} else if (targetColumnId === 'waiting') {
					taskToSnooze.value = task;
					showSnoozeDialog.value = true;
				}
			} catch (e) {
				console.error('Error changing task column:', e);
				await store.dispatch('fetchTasks');
			}
		};

		const handleSnoozeConfirm = async (waitDate: string) => {
			const targetTask = taskToSnooze.value;
			showSnoozeDialog.value = false;
			taskToSnooze.value = null;

			if (targetTask) {
				try {
					if (targetTask.start || targetTask.uuid === activeTaskUuid.value) {
						await store.dispatch('stopTimer', targetTask.uuid);
					}
					const payload = { ...targetTask, status: 'pending', wait: waitDate };
					if (payload.start) delete payload.start;
					await store.dispatch('updateTasks', [payload]);
				} catch (e) {
					console.error('Error snoozing task:', e);
					await store.dispatch('fetchTasks');
				}
			}
		};

		const handleSnoozeCancel = () => {
			showSnoozeDialog.value = false;
			taskToSnooze.value = null;
			// Trigger a fresh fetch to reset the board columns back to actual state
			store.dispatch('fetchTasks');
		};

		return {
			mode,
			allModes,
			selectedProject,
			projectOptions,
			selectedAssignee,
			assigneeOptions,
			searchQuery,
			filteredTasks,
			activeTaskUuid,
			showTaskDialog,
			editingTask,
			showSnoozeDialog,
			handleEditTask,
			handleCompleteTask,
			handleDeleteTask,
			handleToggleTimer,
			handleColumnChange,
			handleSnoozeConfirm,
			handleSnoozeCancel
		};
	}
});
</script>
