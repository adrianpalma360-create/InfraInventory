import { FastifyPluginAsync } from 'fastify';
import { TicketService } from './ticket.service.js';
import { createTicketSchema, updateTicketSchema, createTicketCommentSchema } from './ticket.schema.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';

export const ticketRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new TicketService(fastify.prisma);

  fastify.addHook('preHandler', authenticate);

  // GET /api/tickets
  fastify.get('/tickets', {
    preHandler: [requirePermission('TICKET_READ')],
    handler: async (request) => {
      const query = request.query as any;
      const list = await service.listTickets(query);
      return { success: true, data: list };
    },
  });

  // GET /api/tickets/:id
  fastify.get('/tickets/:id', {
    preHandler: [requirePermission('TICKET_READ')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const item = await service.getTicketById(id);
        return { success: true, data: item };
      } catch (err: any) {
        return reply.status(404).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/tickets
  fastify.post('/tickets', {
    preHandler: [requirePermission('TICKET_CREATE')],
    handler: async (request, reply) => {
      const input = createTicketSchema.parse(request.body);
      const actorId = request.user?.id;
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const created = await service.createTicket(input, actorId, actorName);
        return reply.status(201).send({ success: true, data: created });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // PUT /api/tickets/:id
  fastify.put('/tickets/:id', {
    preHandler: [requirePermission('TICKET_UPDATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateTicketSchema.parse(request.body);
      const actorId = request.user?.id;
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const updated = await service.updateTicket(id, input, actorId, actorName);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // DELETE /api/tickets/:id
  fastify.delete('/tickets/:id', {
    preHandler: [requirePermission('TICKET_DELETE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const actorName = request.user?.name || request.user?.username || 'admin';
      try {
        const result = await service.deleteTicket(id, actorName);
        return { success: true, data: result };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // POST /api/tickets/:id/comments
  fastify.post('/tickets/:id/comments', {
    preHandler: [requirePermission('TICKET_UPDATE')],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createTicketCommentSchema.parse(request.body);
      const userId = request.user?.id;
      const userName = request.user?.name || request.user?.username || 'System';
      try {
        const comment = await service.addComment(id, input, userId, userName);
        return reply.status(201).send({ success: true, data: comment });
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }
    },
  });

  // GET /api/tickets/export (CSV)
  fastify.get('/tickets/export', {
    preHandler: [requirePermission('TICKET_EXPORT')],
    handler: async (request, reply) => {
      const tickets = await service.listTickets();
      const headers = ['ID,TicketNumber,Title,Type,Priority,Status,Assignee,Machine,Asset,Created,DueDate'];
      const rows = tickets.map((t) => [
        t.id,
        `"${t.ticketNumber}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        t.type,
        t.priority,
        t.status,
        `"${t.assignee?.name || ''}"`,
        `"${t.machine?.hostname || ''}"`,
        `"${t.asset?.assetTag || ''}"`,
        t.createdAt.toISOString(),
        t.dueDate?.toISOString() || '',
      ].join(','));
      const csv = [headers, ...rows].join('\n');
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="tickets-export.csv"')
        .send(csv);
    },
  });
};
