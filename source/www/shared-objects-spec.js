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

        var created, so = SharedObjects.On({

            create: function() {
                if (this.owner) {
                    created = true;
                }
            }
        });

        runs(function() {
            waitsFor(function() { return created; }, "SharedObjects.On#create never called", 10000);

            so.destroy();
            expect(created).toBeDefined();
        });
    });
});
