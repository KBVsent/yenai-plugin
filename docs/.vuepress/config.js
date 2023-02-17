const navConfig = require('./config/navConfig')
const pluginsConfig = require('./config/pluginsConfig')
const headConfig = require('./config/headConfig')
const sidebarConfig = require('./config/sidebarConfig')

module.exports = {
  base: '/yenai-plugin/',
  title: 'Yenai-Plugin',
  description: 'Yunzai-Bot的一个扩展插件',
  head: headConfig,
  plugins: pluginsConfig,
  themeConfig: {
    // sidebar:sidebarConfig ,
    logo: '/img/logo.png',
    nav: navConfig,
    lastUpdated: '最后更新',
    // 默认值是 true 。设置为 false 来禁用所有页面的 下一篇 链接
    nextLinks: true,
    // 默认值是 true 。设置为 false 来禁用所有页面的 上一篇 链接
    prevLinks: true,
    // 假定是 GitHub. 同时也可以是一个完整的 GitLab URL
    repo: 'yeyang52/yenai-plugin',
    // 自定义仓库链接文字。默认从 `themeConfig.repo` 中自动推断为
    // "GitHub"/"GitLab"/"Bitbucket" 其中之一，或是 "Source"。
    repoLabel: 'GitHub',
    // 假如文档不是放在仓库的根目录下：
    docsDir: 'docs',
    // 假如文档放在一个特定的分支下：
    docsBranch: 'docs',
    // 默认是 false, 设置为 true 来启用
    editLinks: true,
    // 默认为 "Edit this page"
    editLinkText: '在 GitHub 上编辑此页'
  }
}