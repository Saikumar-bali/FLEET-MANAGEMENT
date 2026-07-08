import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getWorkspace } from '../../services/workspace.service';

export async function getMyWorkspaceController(req: Request, res: Response) {
  const userId = req.authUser!.id;
  const workspace = await getWorkspace(userId, req.authPreloadedUser);
  sendSuccess(res, workspace);
}
