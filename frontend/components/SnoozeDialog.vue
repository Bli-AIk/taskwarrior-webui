<template>
	<v-dialog v-model="internalValue" max-width="400" @click:outside="cancel">
		<v-card>
			<v-card-title class="headline">稍后处理</v-card-title>
			<v-card-text>
				<div class="subtitle-1 mb-2">快捷选项</div>
				<v-row dense class="mb-4">
					<v-col cols="4" v-for="preset in presets" :key="preset.label">
						<v-btn small block outlined color="primary" @click="applyPreset(preset)">
							{{ preset.label }}
						</v-btn>
					</v-col>
				</v-row>
				
				<v-divider class="mb-4"></v-divider>
				
				<div class="subtitle-1 mb-2">自定义日期时间</div>
				<v-text-field
					v-model="customDatetime"
					type="datetime-local"
					outlined
					dense
					hide-details
				></v-text-field>
				
				<div v-if="isPastDate" class="red--text text-caption mt-1">
					不能选择过去的日期。
				</div>
			</v-card-text>
			
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn text color="grey" @click="cancel">取消</v-btn>
				<v-btn color="primary" @click="confirm" :disabled="!isValid">确定</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from '@nuxtjs/composition-api';
import moment from 'moment';

export default defineComponent({
	name: 'SnoozeDialog',
	props: {
		value: {
			type: Boolean,
			default: false
		}
	},
	setup(props, { emit }) {
		const internalValue = computed({
			get: () => props.value,
			set: (val) => {
				if (!val) emit('cancel');
			}
		});

		const customDatetime = ref<string>('');

		const presets = [
			{ label: '1 小时后', getMoment: () => moment().add(1, 'hour') },
			{ label: '2 小时后', getMoment: () => moment().add(2, 'hours') },
			{ label: '4 小时后', getMoment: () => moment().add(4, 'hours') },
			{ label: '今天稍晚', getMoment: () => {
				const today5pm = moment().hours(17).minutes(0).seconds(0);
				return moment().isAfter(today5pm) ? moment().add(2, 'hours') : today5pm;
			}},
			{ label: '明天', getMoment: () => moment().add(1, 'day').hours(9).minutes(0).seconds(0) },
			{ label: '这周末', getMoment: () => moment().day(6).hours(9).minutes(0).seconds(0) }, // Saturday 9am
			{ label: '下周', getMoment: () => moment().add(1, 'weeks').startOf('isoWeek').hours(9).minutes(0).seconds(0) } // Monday 9am
		];

		const applyPreset = (preset: any) => {
			const targetMoment = preset.getMoment();
			// HTML5 datetime-local expects YYYY-MM-DDTHH:mm
			customDatetime.value = targetMoment.format('YYYY-MM-DDTHH:mm');
		};

		// When dialog opens, reset fields
		watch(() => props.value, (newVal) => {
			if (newVal) {
				customDatetime.value = '';
			}
		});

		const isPastDate = computed(() => {
			if (!customDatetime.value) return false;
			return moment(customDatetime.value).isBefore(moment());
		});

		const isValid = computed(() => {
			return !!customDatetime.value && !isPastDate.value;
		});

		const confirm = () => {
			if (isValid.value) {
				// Convert local datetime to UTC ISO string for Taskwarrior (YYYYMMDDTHHMMSSZ)
				const twDateString = moment(customDatetime.value).utc().format('YYYYMMDD[T]HHmmss[Z]');
				emit('confirm', twDateString);
			}
		};

		const cancel = () => {
			emit('cancel');
		};

		return {
			internalValue,
			customDatetime,
			presets,
			applyPreset,
			isPastDate,
			isValid,
			confirm,
			cancel
		};
	}
});
</script>
