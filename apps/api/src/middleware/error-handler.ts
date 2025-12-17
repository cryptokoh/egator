import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request parameters',
      details: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Known HTTP errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message
    });
  }

  // Unknown errors
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message
  });
}
