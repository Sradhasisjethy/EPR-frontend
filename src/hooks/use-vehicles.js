import { createResourceHooks } from '@/lib/create-resource-hooks';

/**
 * Vehicle master. Challans and transfers still store `vehicleNumber` as text —
 * this exists so those forms can suggest one consistent spelling, and so a
 * lorry's transporter, capacity and paperwork can be looked up.
 */
export const {
  useList: useVehicles,
  useGet: useVehicle,
  useCreate: useCreateVehicle,
  useUpdate: useUpdateVehicle,
  useDelete: useDeleteVehicle,
} = createResourceHooks('vehicles', '/vehicles');
