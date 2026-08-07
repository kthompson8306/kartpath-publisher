import { Router, type IRouter } from "express";
import { GetPublicationBySlugParams, GetPublicationBySlugResponse } from "@workspace/api-zod";
import { getPublicationBySlug } from "../lib/platform";

const router: IRouter = Router();

router.get("/publications/:slug", async (req, res): Promise<void> => {
  const params = GetPublicationBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getPublicationBySlug(params.data.slug);
  if (!result?.settings) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  res.json(
    GetPublicationBySlugResponse.parse({
      ...result.publication,
      settings: result.settings,
    }),
  );
});

export default router;