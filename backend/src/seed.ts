import { EntityManager } from '@mikro-orm/mysql';
import { Resident, ResidentRole } from './entities/Resident';
import { Zone } from './entities/Zone';
import { Task, TaskType, AssignmentType } from './entities/Task';

export async function seedDatabaseIfEmpty(em: EntityManager): Promise<void> {
  const count = await em.count(Resident);
  if (count > 0) {
    return;
  }

  console.log('🌱 Base de datos vacía. Cargando datos iniciales de ejemplo para Hometasking...');

  // 1. Crear Residentes
  const admin = em.create(Resident, {
    name: 'Francisco',
    avatar: '🧑‍💻',
    color: '#4F46E5',
    role: ResidentRole.ADMIN,
    pin: '1234',
    active: true,
    createdAt: new Date(),
  });

  const pilar = em.create(Resident, {
    name: 'Pilar',
    avatar: '👩‍🎨',
    color: '#EC4899',
    role: ResidentRole.RESIDENT,
    active: true,
    createdAt: new Date(),
  });

  const silvina = em.create(Resident, {
    name: 'Silvina',
    avatar: '👩',
    color: '#10B981',
    role: ResidentRole.RESIDENT,
    active: true,
    createdAt: new Date(),
  });

  const cristian = em.create(Resident, {
    name: 'Cristian',
    avatar: '🧑',
    color: '#F59E0B',
    role: ResidentRole.RESIDENT,
    active: true,
    createdAt: new Date(),
  });

  // 2. Crear Sectores / Puestos (Zones)
  const zoneDispenser = em.create(Zone, {
    name: 'Puesto de Agua / Cocina',
    icon: '💧',
    qrCode: 'ZONE-COCINA-AGUA',
    description: 'Dispensador de bidones de agua potable y mesada principal',
    createdAt: new Date(),
  });

  const zonePlantaBaja = em.create(Zone, {
    name: 'Planta Baja y Living',
    icon: '🛋️',
    qrCode: 'ZONE-PLANTA-BAJA',
    description: 'Comedor, sala de estar y pisos de planta baja',
    createdAt: new Date(),
  });

  const zonePatioLavadero = em.create(Zone, {
    name: 'Patio y Lavadero',
    icon: '👕',
    qrCode: 'ZONE-LAVADERO',
    description: 'Tendedero, lavarropas y exterior',
    createdAt: new Date(),
  });

  // 3. Crear Tareas de ejemplo del documento de visión
  const taskAgua = em.create(Task, {
    title: 'Buscar agua (Recargar bidones)',
    description: 'Ir a recargar los bidones de agua potable cuando queda 1 solo bidón lleno.',
    icon: '🚰',
    points: 5,
    type: TaskType.STOCK,
    currentStock: 1, // Inicia en 1 para mostrar cómo se activa el aviso de umbral mínimo
    minThreshold: 1,
    maxStock: 4,
    unitName: 'bidones llenos',
    isPendingManual: false,
    assignmentType: AssignmentType.ALL,
    zone: zoneDispenser,
    qrCode: 'TASK-BUSCAR-AGUA',
    createdAt: new Date(),
  });

  const taskBarrerPB = em.create(Task, {
    title: 'Barrer planta baja',
    description: 'Barrer comedor, cocina y pasillo principal.',
    icon: '🧹',
    points: 3,
    type: TaskType.FIXED_SCHEDULE,
    daysOfWeek: '0,1,2,3,4,5,6', // Todos los días
    isPendingManual: false,
    assignmentType: AssignmentType.ALL,
    zone: zonePlantaBaja,
    qrCode: 'TASK-BARRER-PB',
    createdAt: new Date(),
  });

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const taskMuebles = em.create(Task, {
    title: 'Repasar los muebles',
    description: 'Pasar franela o plumero por muebles del living y mesas.',
    icon: '✨',
    points: 2,
    type: TaskType.INTERVAL,
    intervalDays: 2, // Se repite día por medio
    lastCompletedAt: twoDaysAgo,
    lastCompletedBy: pilar,
    isPendingManual: false,
    assignmentType: AssignmentType.GROUP,
    zone: zonePlantaBaja,
    qrCode: 'TASK-REPASAR-MUEBLES',
    createdAt: new Date(),
  });
  taskMuebles.assignedResidents.add(admin, pilar);

  const taskRopa = em.create(Task, {
    title: 'Revisar si hay ropa colgada',
    description: 'Revisar el tendedero por la mañana y entrar la ropa seca.',
    icon: '🧺',
    points: 1,
    type: TaskType.FIXED_SCHEDULE,
    daysOfWeek: '0,1,2,3,4,5,6',
    timeOfDay: '09:00',
    isPendingManual: false,
    assignmentType: AssignmentType.ALL,
    zone: zonePatioLavadero,
    qrCode: 'TASK-ROPA-COLGADA',
    createdAt: new Date(),
  });

  const taskBasura = em.create(Task, {
    title: 'Sacar la basura',
    description: 'Vaciar el cesto de la cocina y llevar la bolsa al contenedor exterior.',
    icon: '🗑️',
    points: 2,
    type: TaskType.ON_DEMAND,
    isPendingManual: true,
    assignmentType: AssignmentType.ALL,
    zone: zoneDispenser,
    qrCode: 'TASK-SACAR-BASURA',
    createdAt: new Date(),
  });

  await em.persistAndFlush([
    admin,
    pilar,
    silvina,
    cristian,
    zoneDispenser,
    zonePlantaBaja,
    zonePatioLavadero,
    taskAgua,
    taskBarrerPB,
    taskMuebles,
    taskRopa,
    taskBasura,
  ]);

  console.log('✅ Datos iniciales creados con éxito.');
}
