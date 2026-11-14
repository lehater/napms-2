// Working REAL collections; Needs remain scoped to their Process.
export const navigation = [
  { group: 'Бизнес-контекст', title: 'Бизнес-процессы', path: '/business-processes' },
  { group: 'Каталоги', title: 'Профили приложений', path: '/applications' },
  { group: 'Каталоги', title: 'Развёрнутые компоненты', path: '/deployments' },
  { group: 'Управление доступом', title: 'Заявки на доступ', path: '/access-requests' },
  { group: 'Управление доступом', title: 'Правила политики', path: '/policy-rules' },
] as const
