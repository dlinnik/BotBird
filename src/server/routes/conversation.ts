import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getOrCreateConversation } from '../services/conversationService.js';
import { toConversationDto } from '../utils/serializers.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const auth = req.auth!;
    const conversation = await getOrCreateConversation(auth);
    res.json(toConversationDto(conversation));
  } catch (err) {
    next(err);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    const auth = req.auth!;
    const context = req.body?.context as Record<string, unknown> | undefined;

    const conversation = await getOrCreateConversation(auth);

    if (context && typeof context === 'object') {
      conversation.lastContext = context;
      await conversation.save();
    }

    res.json(toConversationDto(conversation));
  } catch (err) {
    next(err);
  }
});

export default router;
