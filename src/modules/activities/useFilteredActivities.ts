import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { activities } from './registry'
import { DOMAIN_GROUPS, groupOf, type AgeGroup } from './taxonomy'
import type { ActivityFilterState } from './components/ActivityFilters.vue'

export function useFilteredActivities(initial: Partial<ActivityFilterState> = {}) {
  const { t } = useI18n()
  const filters = ref<ActivityFilterState>({
    q: '',
    group: null,
    ageGroup: null,
    format: null,
    ...initial,
  })
  const list = computed(() => {
    const q = filters.value.q.trim().toLowerCase()
    return activities.filter((a) => {
      if (filters.value.group && !a.domains.some((d) => groupOf(d) === filters.value.group))
        return false
      if (filters.value.ageGroup && !a.ageGroups.includes(filters.value.ageGroup as AgeGroup))
        return false
      if (filters.value.format && !a.formats.includes(filters.value.format as never)) return false
      if (q) {
        const hay =
          `${t(`activity.${a.id}.name`)} ${t(`activity.${a.id}.description`)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  })
  return { filters, list, groups: DOMAIN_GROUPS }
}
