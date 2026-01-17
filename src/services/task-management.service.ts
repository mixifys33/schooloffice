/**
 * Task Management Service
 * Handles task creation, status updates, and deadline monitoring for staff members.
 * 
 * Requirements: 12.1, 12.2, 12.3
 * - 12.1: Display tasks with status (pending, completed, overdue)
 * - 12.2: Link tasks to relevant modules (academics, reports, attendance, finance)
 * - 12.3: Mark tasks as overdue when deadline passes and generate alerts
 */

import { prisma } from '@/lib/db';
import { AuditService, AuditAction, AuditResource } from './audit.service';
import {
  TaskType,
  TaskStatus,
  LinkedModule,
  AlertType,
  AlertSeverity,
} from '@/types/enums';
import {
  Task,
  CreateTaskInput,
  Alert,
} from '@/types/staff-dashboard';

/**
 * Task filters for querying tasks
 */
export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  linkedModule?: LinkedModule;
  deadlineBefore?: Date;
  deadlineAfter?: Date;
}

/**
 * Task update input
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  deadline?: Date;
  status?: TaskStatus;
}

/**
 * Task Management Service
 * Requirements: 12.1, 12.2, 12.3
 */
export class TaskManagementService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  // ============================================
  // TASK CREATION
  // Requirements: 12.1, 12.2
  // ============================================

  /**
   * Create a new task for a staff member
   * Requirements: 12.1 - Create task with title, description, type, linkedModule, deadline
   * Requirements: 12.2 - Link tasks to modules (academics, reports, attendance, finance)
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    // Validate staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: input.staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${input.staffId}`);
    }

    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: input.schoolId },
    });

    if (!school) {
      throw new Error(`School not found: ${input.schoolId}`);
    }

    // Determine initial status based on deadline
    const now = new Date();
    const initialStatus = input.deadline < now ? TaskStatus.OVERDUE : TaskStatus.PENDING;

    const task = await prisma.staffTask.create({
      data: {
        staffId: input.staffId,
        schoolId: input.schoolId,
        title: input.title,
        description: input.description,
        type: input.type,
        linkedModule: input.linkedModule,
        linkedResourceId: input.linkedResourceId,
        deadline: input.deadline,
        status: initialStatus,
        createdBy: input.createdBy,
      },
    });

    // Log task creation
    await this.auditService.log({
      schoolId: input.schoolId,
      userId: input.createdBy,
      action: AuditAction.CREATE,
      resource: AuditResource.STAFF,
      resourceId: task.id,
      newValue: {
        taskId: task.id,
        staffId: input.staffId,
        title: input.title,
        type: input.type,
        linkedModule: input.linkedModule,
        deadline: input.deadline.toISOString(),
        status: initialStatus,
      },
    });

    return this.mapToTask(task);
  }

  // ============================================
  // TASK STATUS MANAGEMENT
  // Requirements: 12.1
  // ============================================

  /**
   * Update task status
   * Requirements: 12.1 - Update status (PENDING -> COMPLETED or OVERDUE)
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    updatedBy: string
  ): Promise<Task> {
    const task = await prisma.staffTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const previousStatus = task.status;
    const updateData: Record<string, unknown> = { status };

    // Set completedAt when marking as completed
    if (status === TaskStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (status === TaskStatus.PENDING) {
      // Clear completedAt if reverting to pending
      updateData.completedAt = null;
    }

    const updatedTask = await prisma.staffTask.update({
      where: { id: taskId },
      data: updateData,
    });

    // Log status change
    await this.auditService.log({
      schoolId: task.schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: taskId,
      previousValue: {
        status: previousStatus,
      },
      newValue: {
        status,
        completedAt: updateData.completedAt,
      },
    });

    return this.mapToTask(updatedTask);
  }

  /**
   * Mark task as completed
   * Requirements: 12.1 - Update status to COMPLETED
   */
  async completeTask(taskId: string, completedBy: string): Promise<Task> {
    return this.updateTaskStatus(taskId, TaskStatus.COMPLETED, completedBy);
  }

  // ============================================
  // TASK RETRIEVAL
  // Requirements: 12.1, 12.2
  // ============================================

  /**
   * Get tasks for a staff member with optional filtering
   * Requirements: 12.1 - Display tasks with status (pending, completed, overdue)
   * Requirements: 12.2 - Filter by linked module
   */
  async getTasksForStaff(
    staffId: string,
    filters?: TaskFilters
  ): Promise<Task[]> {
    const where: Record<string, unknown> = { staffId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.linkedModule) {
      where.linkedModule = filters.linkedModule;
    }

    if (filters?.deadlineBefore || filters?.deadlineAfter) {
      where.deadline = {};
      if (filters.deadlineBefore) {
        (where.deadline as Record<string, Date>).lte = filters.deadlineBefore;
      }
      if (filters.deadlineAfter) {
        (where.deadline as Record<string, Date>).gte = filters.deadlineAfter;
      }
    }

    const tasks = await prisma.staffTask.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // OVERDUE first, then PENDING, then COMPLETED
        { deadline: 'asc' },
      ],
    });

    return tasks.map((task) => this.mapToTask(task));
  }

  /**
   * Get pending tasks for a staff member
   * Requirements: 12.1 - Display pending tasks
   */
  async getPendingTasks(staffId: string): Promise<Task[]> {
    return this.getTasksForStaff(staffId, { status: TaskStatus.PENDING });
  }

  /**
   * Get overdue tasks for a staff member
   * Requirements: 12.1 - Display overdue tasks
   */
  async getOverdueTasks(staffId: string): Promise<Task[]> {
    return this.getTasksForStaff(staffId, { status: TaskStatus.OVERDUE });
  }

  /**
   * Get tasks by linked module
   * Requirements: 12.2 - Link tasks to relevant modules
   */
  async getTasksByModule(
    staffId: string,
    linkedModule: LinkedModule
  ): Promise<Task[]> {
    return this.getTasksForStaff(staffId, { linkedModule });
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId: string): Promise<Task | null> {
    const task = await prisma.staffTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return null;
    }

    return this.mapToTask(task);
  }

  // ============================================
  // DEADLINE MONITORING
  // Requirements: 12.3
  // ============================================

  /**
   * Mark tasks as overdue when deadline passes
   * Requirements: 12.3 - Mark tasks as overdue when deadline passes
   * 
   * This method should be called periodically (e.g., via a cron job)
   * to update task statuses based on deadlines.
   */
  async processOverdueTasks(schoolId?: string): Promise<number> {
    const now = new Date();
    
    const where: Record<string, unknown> = {
      status: TaskStatus.PENDING,
      deadline: { lt: now },
    };

    if (schoolId) {
      where.schoolId = schoolId;
    }

    // Find all pending tasks with passed deadlines
    const overdueTasks = await prisma.staffTask.findMany({
      where,
    });

    // Update each task to overdue status
    const updatePromises = overdueTasks.map(async (task) => {
      await prisma.staffTask.update({
        where: { id: task.id },
        data: { status: TaskStatus.OVERDUE },
      });

      // Log the automatic status change
      await this.auditService.log({
        schoolId: task.schoolId,
        userId: 'SYSTEM',
        action: AuditAction.UPDATE,
        resource: AuditResource.STAFF,
        resourceId: task.id,
        previousValue: { status: TaskStatus.PENDING },
        newValue: {
          status: TaskStatus.OVERDUE,
          reason: 'Deadline passed',
          processedAt: now.toISOString(),
        },
      });
    });

    await Promise.all(updatePromises);

    return overdueTasks.length;
  }

  /**
   * Generate alerts for overdue tasks
   * Requirements: 12.3 - Generate alerts for overdue tasks
   */
  async generateOverdueAlerts(staffId: string): Promise<Alert[]> {
    const overdueTasks = await this.getOverdueTasks(staffId);

    return overdueTasks.map((task) => ({
      id: `overdue-task-${task.id}`,
      type: AlertType.TASK_OVERDUE,
      severity: AlertSeverity.WARNING,
      message: `Overdue: ${task.title}`,
      actionUrl: `/dashboard/tasks/${task.id}`,
      createdAt: task.deadline,
    }));
  }

  /**
   * Get tasks approaching deadline (within specified days)
   * Useful for generating deadline warning alerts
   */
  async getTasksApproachingDeadline(
    staffId: string,
    daysAhead: number = 2
  ): Promise<Task[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.getTasksForStaff(staffId, {
      status: TaskStatus.PENDING,
      deadlineBefore: futureDate,
      deadlineAfter: now,
    });
  }

  /**
   * Generate deadline warning alerts for tasks approaching deadline
   */
  async generateDeadlineWarningAlerts(
    staffId: string,
    daysAhead: number = 2
  ): Promise<Alert[]> {
    const approachingTasks = await this.getTasksApproachingDeadline(staffId, daysAhead);

    return approachingTasks.map((task) => {
      const daysUntilDeadline = Math.ceil(
        (task.deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      return {
        id: `deadline-warning-${task.id}`,
        type: AlertType.MARKS_DEADLINE,
        severity: daysUntilDeadline <= 1 ? AlertSeverity.WARNING : AlertSeverity.INFO,
        message: `Due ${daysUntilDeadline === 0 ? 'today' : daysUntilDeadline === 1 ? 'tomorrow' : `in ${daysUntilDeadline} days`}: ${task.title}`,
        actionUrl: `/dashboard/tasks/${task.id}`,
        createdAt: new Date(),
      };
    });
  }

  // ============================================
  // TASK UPDATE AND DELETE
  // ============================================

  /**
   * Update task details
   */
  async updateTask(
    taskId: string,
    input: UpdateTaskInput,
    updatedBy: string
  ): Promise<Task> {
    const task = await prisma.staffTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const previousValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (input.title !== undefined && input.title !== task.title) {
      previousValue.title = task.title;
      newValue.title = input.title;
    }

    if (input.description !== undefined && input.description !== task.description) {
      previousValue.description = task.description;
      newValue.description = input.description;
    }

    if (input.deadline !== undefined) {
      previousValue.deadline = task.deadline;
      newValue.deadline = input.deadline;
    }

    if (input.status !== undefined && input.status !== task.status) {
      previousValue.status = task.status;
      newValue.status = input.status;
      
      // Handle completedAt based on status change
      if (input.status === TaskStatus.COMPLETED) {
        newValue.completedAt = new Date();
      } else if (task.status === TaskStatus.COMPLETED) {
        newValue.completedAt = null;
      }
    }

    const updatedTask = await prisma.staffTask.update({
      where: { id: taskId },
      data: {
        title: input.title,
        description: input.description,
        deadline: input.deadline,
        status: input.status,
        completedAt: input.status === TaskStatus.COMPLETED 
          ? new Date() 
          : input.status === TaskStatus.PENDING 
            ? null 
            : undefined,
      },
    });

    // Log the update if there were changes
    if (Object.keys(newValue).length > 0) {
      await this.auditService.log({
        schoolId: task.schoolId,
        userId: updatedBy,
        action: AuditAction.UPDATE,
        resource: AuditResource.STAFF,
        resourceId: taskId,
        previousValue,
        newValue,
      });
    }

    return this.mapToTask(updatedTask);
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string, deletedBy: string): Promise<void> {
    const task = await prisma.staffTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    await prisma.staffTask.delete({
      where: { id: taskId },
    });

    // Log the deletion
    await this.auditService.log({
      schoolId: task.schoolId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      resource: AuditResource.STAFF,
      resourceId: taskId,
      previousValue: {
        title: task.title,
        type: task.type,
        linkedModule: task.linkedModule,
        status: task.status,
        deadline: task.deadline,
      },
    });
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Create multiple tasks at once (e.g., for term-based task generation)
   */
  async createBulkTasks(inputs: CreateTaskInput[]): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const input of inputs) {
      const task = await this.createTask(input);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Get task statistics for a staff member
   */
  async getTaskStatistics(staffId: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    completionRate: number;
  }> {
    const tasks = await prisma.staffTask.findMany({
      where: { staffId },
      select: { status: true },
    });

    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === TaskStatus.PENDING).length;
    const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const overdue = tasks.filter((t) => t.status === TaskStatus.OVERDUE).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 100;

    return {
      total,
      pending,
      completed,
      overdue,
      completionRate,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map Prisma StaffTask to Task interface
   */
  private mapToTask(task: {
    id: string;
    staffId: string;
    schoolId: string;
    title: string;
    description: string | null;
    type: string;
    linkedModule: string;
    linkedResourceId: string | null;
    deadline: Date;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
    createdBy: string;
  }): Task {
    return {
      id: task.id,
      staffId: task.staffId,
      schoolId: task.schoolId,
      title: task.title,
      description: task.description || undefined,
      type: task.type as TaskType,
      linkedModule: task.linkedModule as LinkedModule,
      linkedResourceId: task.linkedResourceId || undefined,
      deadline: task.deadline,
      status: task.status as TaskStatus,
      completedAt: task.completedAt || undefined,
      createdAt: task.createdAt,
      createdBy: task.createdBy,
    };
  }
}

// Export singleton instance
export const taskManagementService = new TaskManagementService();
