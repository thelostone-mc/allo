import { LiveObject, Spec, Timestamp, Event, Property, Address, Json, OnEvent, resolveMetadata } from '@spec.dev/core'

/**
 * A Program on the Allo protocol.
 */
@Spec({ 
    uniqueBy: ['address', 'chainId']
})
class Program extends LiveObject {
    // Address of the program.
    @Property()
    address: Address

    // Program name.
    @Property()
    name: string

    // Pointer to the program's off-chain metadata.
    @Property()
    metaPtr: Json

    // The program's off-chain metadata.
    @Property()
    metadata: Json

    // When the program was first created.
    @Property({ canUpdate: false })
    createdAt: Timestamp

    // ==== Event Handlers ===================

    @OnEvent('allo.ProgramFactory.ProgramCreated')
    async createProgram(event: Event) {
        this.address = event.data.programContractAddress
        this.createdAt = this.blockTimestamp

        // Get metaPtr from program contract and resolve off-chain metadata.
        const contract = this.bind(this.address, 'allo.Program')
        const [protocolId, pointer] = (await contract.metaPtr()).outputArgs || []
        this.metaPtr = [protocolId, pointer]
        this.metadata = await resolveMetadata(pointer, { protocolId })
        this.name = this.metadata.name

        // Add new program to contract group.
        this.addContractToGroup(this.address, 'allo.Program')
    }

    // Update block timestamp on these events.
    @OnEvent('allo.Program.RoleGranted')
    @OnEvent('allo.Program.RoleRevoked')
    trackUpdate(event: Event) {
        this.address = event.origin.contractAddress
    }
}
export default Program
