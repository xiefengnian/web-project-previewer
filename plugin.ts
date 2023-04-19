import { IApi } from 'umi';
import { Router } from 'express';

export default (api: IApi) => {
  api.describe({
    key: 'modifyHeader',
    config: {
      schema(joi) {
        return joi.object();
      },
    },
    enableBy: api.EnableBy.config,
  });

  api.onBeforeMiddleware(({ app }) => {
    const router = Router();

    router.use((req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      next();
    });

    router.use(app._router);

    app._router = router;
  });
};
