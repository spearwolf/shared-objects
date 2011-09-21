describe("shared_objects", function() {

    beforeEach(function() {
        waitsFor(function() { return SharedObjects.IsConnected(); }, "SharedObjects never connected to server", 10000);
    });

    it("connects to shared_objects server", function() {

        runs(function() {
            expect(SharedObjects.IsConnected()).toBeTruthy();
        });
    });

    it("creates a new SharedObject for me", function() {

        var so, me;

        runs(function() {
            so = SharedObjects.On({

                create: function() {
                    console.log("SharedObjects.On#create", this);
                    if (this.owner) {
                        me = this;
                    }
                },

                update: function() {
                    console.log("SharedObjects.On#create", this);
                    if (this.owner) {
                        me = this;
                    }
                }
            });

            waitsFor(function() { return typeof me === 'object'; }, "SharedObjects.On#create never called", 10000);
        });

        runs(function() {
            so.destroy();
            expect(me).toBeDefined();
        });
    });
});
