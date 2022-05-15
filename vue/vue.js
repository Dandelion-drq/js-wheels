const Vue = function (options) {
    // 将data赋值给this.data，源码这部分用的Proxy我们先用最简单的方式临时实现
    if (options && typeof options.data === 'function') {
        this.data = options.data.apply(this);
    }

    // 挂载函数
    this.mount = () => {
        new Watcher(this, this.render);
    }

    // 渲染函数
    this.render = () => {
        console.log('触发render')
        // 读取一下data的值，模拟页面渲染调用
        this.data.text
    }

    new Observer(this.data)
}

const Observer = function (data) {
    console.log('data数据挟持')

    // 循环修改为每个属性添加get set
    for (const key in data) {
        defineReactive(data, key)
    }
}

function defineReactive(obj, key) {
    // 局部变量dep，用于get set内部调用
    const dep = new Dep()

    let val = obj[key]

    Object.defineProperty(obj, key, {
        // 设置当前描述属性为可被循环
        enumerable: true,
        // 设置当前描述属性可被修改
        configurable: true,
        get() {
            console.log('触发getter');

            // 调用依赖收集器中的addSub，用于收集当前属性与Watcher中的依赖关系
            dep.depend()

            return val
        },
        set(newVal) {
            console.log('触发setter');

            if (newVal === val) {
                return;
            }

            val = newVal

            // 当值发生变更时，通知依赖收集器，更新每个需要更新的Watcher
            dep.notify()
        }
    })
}

// 依赖收集器
const Dep = function () {
    console.log('创建Dep')

    // 观察者数组
    this.watchers = []

    this.depend = () => {
        console.log('触发依赖收集')

        if (Dep.target) {
            console.log('Dep.target', Dep.target)

            // 这里其实可以直接写this.addSub(Dep.target)，没有这么写因为想还原源码的过程。
            Dep.target.addDep(this);
        }
    }

    this.addWatcher = (watcher) => {
        console.log('绑定观察者对象')
        this.watchers.push(watcher)
    }

    this.notify = () => {
        this.watchers.forEach(watcher => {
            watcher.update()
        })
    }
}

// 观察者对象
const Watcher = function (vm, render) {
    console.log('创建Watcher')

    this.vm = vm;

    // 将当前Dep.target指向自己
    Dep.target = this;

    // 更新方法，用于触发vm.render
    this.update = () => {
        console.log('触发watcher update');
        render()
    }

    // 向Dep添加当前Wathcer
    this.addDep = (dep) => {
        dep.addWatcher(this)
    }

    // 这里会首次调用vm._render，从而触发属性的getter
    // 从而将当前的Wathcer与Dep关联起来
    this.value = render();

    // 这里清空了Dep.target，为了防止notify触发时，不停的绑定Watcher与Dep，
    // 造成代码死循环
    Dep.target = null;
}

// ===========================

// 开始测试

const vue = new Vue({
    data() {
        return {
            text: 'hello world',
            text2: 'hey'
        };
    }
})

console.log('\n调用mount')
vue.mount(); // in get

console.log('\n修改text的值')
vue.data.text = '123'; // in watcher update /n in get

// 如果修改一个页面中并没有用到的值，不会触发更新，验证一下
console.log('\n修改text2的值')
vue.data.text2 = '123'; // nothing


// 多个Vue实例引用同一个data时
let commonData = {
    text: 'hello world'
};

const vm1 = new Vue({
    data() {
        return commonData;
    }
})

const vm2 = new Vue({
    data() {
        return commonData;
    }
})

console.log('\n测试多个Vue实例引用同一个data')

vm1.mount(); // in get
vm2.mount(); // in get
commonData.text = 'hey' // 输出了两次 in watcher update /n in get
