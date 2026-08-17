import { createResourceHooks } from '@/lib/create-resource-hooks';

export const {
  useList: usePriceLists,
  useGet: usePriceList,
  useCreate: useCreatePriceList,
  useUpdate: useUpdatePriceList,
  useDelete: useDeletePriceList,
} = createResourceHooks('price-lists', '/price-lists');
