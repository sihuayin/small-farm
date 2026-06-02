# 小红书发布包

## 1. 笔记标题

如果你有个小园子，先别急着下种

备选标题：

- 我做了一个像农场游戏一样的菜园规划器
- 后院种菜前，我想先把菜园在网页里摆一遍
- 给小园子、阳台菜畦、后院农夫的规划工具

## 2. 正文文案

如果你有块农地、后院、阳台小园子，打算种点蔬菜、香草或者花，先试试这个「农夫计划器」。

它像轻量农场游戏一样，可以先设置地块大小，再选择想种的植物，把番茄、罗勒、生菜、花卉拖到网格里规划。

系统会提示哪些植物适合种在一起，哪些容易冲突，也会整理浇水、采收、清理地块和下一季轮作建议。

目前还是 Alpha 早期版本，想找真正会种点东西、或者正准备开始小园子的人试用。欢迎帮我看看：它对你有没有用？哪里还不够顺手？

## 3. 图片顺序

1. `marketing/xiaohongshu/assets/01-cover.png`
   - 封面图文案：有个小园子？先在网页里种一遍
   - 画面重点：吸引停留，直接讲清“像农场游戏，但是真实种菜规划”。

2. `marketing/xiaohongshu/assets/02-setup.png`
   - 图文案：先设置地块大小
   - 画面重点：创建正式菜园，不是打开就进 Demo。

3. `marketing/xiaohongshu/assets/03-plant.png`
   - 图文案：选植物，然后点地块种下
   - 画面重点：展示真实操作路径，用户一眼知道怎么用。

4. `marketing/xiaohongshu/assets/04-tasks.png`
   - 图文案：种下后，任务跟着状态出现
   - 画面重点：展示浇水、采收、整理地块的下一步闭环。

视频：`marketing/small-farm-xhs.mp4`

- 建议作为主视频发布。
- 视频已经按真实操作流程重做：创建菜园 -> 选植物 -> 进入规划器 -> 点击地块种下 -> 查看任务。

## 4. 视频口播 / 字幕节奏

0-3 秒：
有个小园子？先在网页里种一遍。

3-7 秒：
先设置地块尺寸，创建自己的菜园。

7-12 秒：
选择你想种的蔬菜、香草、花卉。

12-17 秒：
进入规划器，选中植物，点击地块种下。

17-23 秒：
种下后可以继续布局，也可以查看任务。

23-30 秒：
Alpha 版本，想找真正有小园子的人试用。

## 5. 话题标签

#园艺 #种菜 #阳台种菜 #后院种菜 #小院生活 #自给自足 #独立开发 #效率工具 #农场游戏 #数字农业

## 6. 评论区置顶

这是一个早期 Alpha 工具，目前天气和地区数据还是 mock。更想先验证：真实种菜的人会不会需要这种规划方式？如果你有菜畦、小院、阳台种植区，欢迎试用后给我反馈。

## 7. 视频生成

渲染小红书竖版视频：

```bash
pnpm --filter video render:xhs
```

生成封面图：

```bash
pnpm --filter video still:xhs
```

输出文件：

- `marketing/small-farm-xhs.mp4`
- `marketing/small-farm-xhs-poster.png`
- `marketing/xiaohongshu/assets/01-cover.png`
- `marketing/xiaohongshu/assets/02-setup.png`
- `marketing/xiaohongshu/assets/03-plant.png`
- `marketing/xiaohongshu/assets/04-tasks.png`
