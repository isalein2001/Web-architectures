const express = require('express');
const { prisma } = require('../../prismaClient');

function createExerciseMediaRouter() {
  const router = express.Router();

  router.get('/', async (_req, res) => {
    try {
      const media = await prisma.exerciseMedia.findMany({
        orderBy: [{ displayOrder: 'asc' }, { exerciseName: 'asc' }],
      });

      res.status(200).json(media.map((entry) => ({
        exerciseName: entry.exerciseName,
        imagePath: entry.imagePath,
        displayOrder: entry.displayOrder,
      })));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createExerciseMediaRouter;
