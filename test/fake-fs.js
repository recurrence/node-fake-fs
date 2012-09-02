var should = require('should')
var sinon = require('sinon')
var Fs = require('..')

function Cb () {
    var spy = sinon.spy()

    spy.error = function (err) {
        this.calledOnce.should.be.true
        this.firstCall.args[0].code.should.equal(err)
    }

    spy.result = function () {
        this.calledOnce.should.be.true
        should.not.exist(this.firstCall.args[0])
        return this.firstCall.args[1]
    }

    return spy
}

describe('Fake FS', function () {
    var fs, cb

    beforeEach(function () {
        fs = new Fs
        cb = Cb()
    })

    describe('.dir(path, [opts])', function () {
        it('Should define dir', function () {
            fs.dir('a/b/c').statSync('a/b/c').isDirectory().should.be.true
        })

        it('Should support options', function () {
            var stat = fs.dir('a', {
                mtime: 10,
                atime: 30
            }).statSync('a')
            stat.should.have.property('mtime').equal(10)
            stat.should.have.property('atime').equal(30)
        })

        it('Should work like mkdir -p', function () {
            fs.dir('a', { mtime: 100 })
            fs.dir('a/b/c')
            fs.statSync('a').mtime.should.equal(100)
            fs.statSync('a/b').isDirectory().should.be.true
        })
    })

    describe('.file(path, [opts | content, [encoding]]', function () {
        it('Should define file', function () {
            fs.file('a/b.txt').statSync('a/b.txt').isFile().should.be.true
        })

        it('Should work like mkdir -p for parent dir', function () {
            fs.dir('a', { mtime: 100 })
            fs.file('a/b.txt')
            fs.statSync('a').mtime.should.equal(100)
        })

        it('Should support content & encoding params', function () {
            fs.file('hello.txt', 'hello')
                .readFileSync('hello.txt', 'utf8')
                .should.equal('hello')

            fs.file('bin', 'TWFu', 'base64')
                .readFileSync('bin', 'utf8').should.equal('Man')

            fs.file('bin2', new Buffer([10]))
            fs.readFileSync('bin2')[0].should.equal(10)
        })

        it('Should support options param', function () {
            fs.file('hello.txt', {
                atime: 10,
                mtime: 20,
                content: 'a'
            })
            var stat = fs.statSync('hello.txt')
            stat.should.have.property('atime').equal(10)
            stat.should.have.property('mtime').equal(20)
            fs.readFileSync('hello.txt')[0].should.equal(97)
        })
    })

    describe('.at(path)', function () {
        it('Returns proxy for defining items prefixed with `path`', function () {
            fs.at('home')
                .file('.gitignore')
                .dir('.local')
            fs.statSync('home/.gitignore').isFile().should.be.true
            fs.statSync('home/.local').isDirectory().should.be.true
        })
    })


    describe('.stat()', function () {
        it('Should return stats', function () {
            fs.file('a/b/c', {ctime: 123}).stat('a/b/c', cb)
            cb.result().should.have.property('ctime').equal(123)
        })

        it('Should throw ENOENT on non-existent path', function () {
            fs.stat('undefined', cb)
            cb.error('ENOENT')
        })
    })

    describe('.readdir()', function () {
        it('Should list a dir contents', function () {
            fs.dir('a').file('b.txt').readdir('.', cb)
            cb.result().should.eql(['a', 'b.txt'])
        })

        it('Should throw ENOENT on non-existent path', function () {
            fs.readdir('a', cb)
            cb.error('ENOENT')
        })

        it('Should throw ENOTDIR on non-dir', function () {
            fs.file('a.txt').readdir('a.txt', cb)
            cb.error('ENOTDIR')
        })
    })

    describe('.exists()', function () {
        it('Should return true on existent path', function (done) {
            fs.dir('asd').exists('asd', function (exists) {
                exists.should.be.true
                done()
            })
        })

        it('Should return false for non-existent path', function (done) {
            fs.exists('non-existent', function (exists) {
                exists.should.be.false
                done()
            })
        })
    })

    describe('.readFile()', function () {
        it('Should read file contents', function () {
            var content = new Buffer([1, 2, 3])
            fs.file('bin', content).readFile('bin', cb)
            cb.result().should.equal(content)
        })

        it('Should decode file contents', function () {
            fs.file('file.txt', new Buffer([97])).readFile('file.txt', 'ascii', cb)
            cb.result().should.equal('a')
        })

        it('Should throw ENOENT on non-existent file', function () {
            fs.readFile('foo', cb)
            cb.error('ENOENT')
        })

        it('Should throw EISDIR on directory', function () {
            fs.dir('dir').readFile('dir', cb)
            cb.error('EISDIR')
        })
    })
})