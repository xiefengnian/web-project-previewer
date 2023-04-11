import { IApi } from 'umi';

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
  api.addBeforeMiddlewares(() => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      next();
    };
  });
};
